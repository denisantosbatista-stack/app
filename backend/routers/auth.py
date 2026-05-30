"""Autenticação JWT (email + senha) — LindArt.

Endpoints (todos sob /api/auth):
- POST /register       → cria usuário, retorna user e seta cookies access/refresh
- POST /login          → autentica e seta cookies
- POST /logout         → limpa cookies
- POST /refresh        → renova access_token a partir do refresh cookie
- GET  /me             → retorna usuário autenticado
- POST /forgot-password
- POST /reset-password

Tokens JWT são guardados em cookies httpOnly **e** também são retornados no
corpo do `login`/`register` para que o frontend possa armazenar em
`localStorage` e enviar via `Authorization: Bearer` (modelo dual).
"""
from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from ._shared import db

logger = logging.getLogger("lindart.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 24h — UX simples (não há refresh automático no frontend)
REFRESH_TOKEN_DAYS = 30
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET não configurado no backend/.env")
    return secret


# ---------- senha ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:  # noqa: BLE001
        return False


# ---------- tokens ----------

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def _set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    # SameSite=None + Secure para funcionar em cross-site (frontend preview ↔ backend preview)
    response.set_cookie(
        key="access_token",
        value=access,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


# ---------- helper get_current_user ----------

def _serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc.get("email"),
        "name": doc.get("name") or "",
        "handle": doc.get("handle") or "",
        "role": doc.get("role") or "user",
        "avatar_url": doc.get("avatar_url") or "",
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expirado") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Token inválido") from exc
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    try:
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Usuário inválido") from exc
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


async def get_current_user_optional(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# ---------- brute-force ----------

async def _check_brute_force(identifier: str) -> None:
    now = datetime.now(timezone.utc)
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("locked_until") and rec["locked_until"] > now:
        mins = int((rec["locked_until"] - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Muitas tentativas. Tente novamente em {mins} minutos.",
        )


async def _record_failed_attempt(identifier: str) -> None:
    now = datetime.now(timezone.utc)
    rec = await db.login_attempts.find_one({"identifier": identifier})
    attempts = (rec.get("attempts", 0) if rec else 0) + 1
    update = {"attempts": attempts, "last_attempt": now}
    if attempts >= MAX_FAILED_ATTEMPTS:
        update["locked_until"] = now + timedelta(minutes=LOCKOUT_MINUTES)
        update["attempts"] = 0
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$set": update},
        upsert=True,
    )


async def _clear_attempts(identifier: str) -> None:
    await db.login_attempts.delete_one({"identifier": identifier})


# ---------- schemas ----------

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = ""
    handle: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=128)


class AuthOut(BaseModel):
    user: dict
    access_token: str
    refresh_token: str


# ---------- endpoints ----------

@router.post("/register", response_model=AuthOut)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    handle = (payload.handle or email.split("@")[0]).lower().strip()
    # garantir handle único (sufixar com número se necessário)
    base = handle
    n = 1
    while await db.users.find_one({"handle": handle}):
        n += 1
        handle = f"{base}{n}"
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": (payload.name or "").strip(),
        "handle": handle,
        "role": "user",
        "avatar_url": "",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    _set_auth_cookies(response, access, refresh)
    return {
        "user": _serialize_user(doc),
        "access_token": access,
        "refresh_token": refresh,
    }


@router.post("/login", response_model=AuthOut)
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "0.0.0.0"
    identifier = f"{ip}:{email}"
    await _check_brute_force(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await _record_failed_attempt(identifier)
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    await _clear_attempts(identifier)
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    _set_auth_cookies(response, access, refresh)
    return {
        "user": _serialize_user(user),
        "access_token": access,
        "refresh_token": refresh,
    }


@router.post("/logout")
async def logout(response: Response):
    _clear_auth_cookies(response)
    return {"ok": True}


@router.post("/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Refresh ausente")
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Refresh inválido") from exc
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Tipo inválido")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não existe")
    access = create_access_token(str(user["_id"]), user["email"])
    response.set_cookie(
        key="access_token",
        value=access,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60,
        path="/",
    )
    return {"access_token": access}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _serialize_user(user)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Sempre responde 200 (não vaza existência)
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": str(user["_id"]),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info(f"[reset-password] Token para {email}: {token}")
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Token inválido")
    if rec["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")
    await db.users.update_one(
        {"_id": ObjectId(rec["user_id"])},
        {"$set": {"password_hash": hash_password(payload.password)}},
    )
    await db.password_reset_tokens.update_one(
        {"token": payload.token},
        {"$set": {"used": True}},
    )
    return {"ok": True}


# ---------- seed admin + indexes ----------

async def init_auth():
    """Cria índices, seed admin + usuário de teste. Idempotente."""
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("handle", unique=True, sparse=True)
        await db.login_attempts.create_index("identifier")
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[auth] index init: {exc}")

    seeds = [
        {
            "email": os.environ.get("ADMIN_EMAIL", "admin@lindart.app"),
            "password": os.environ.get("ADMIN_PASSWORD", "Lindart#2026"),
            "name": "Admin LindArt",
            "handle": "admin",
            "role": "admin",
        },
        {
            "email": os.environ.get("TEST_USER_EMAIL", "teste@lindart.app"),
            "password": os.environ.get("TEST_USER_PASSWORD", "Teste#2026"),
            "name": "Usuária Teste",
            "handle": "teste",
            "role": "user",
        },
    ]
    for s in seeds:
        existing = await db.users.find_one({"email": s["email"]})
        if existing is None:
            await db.users.insert_one({
                "email": s["email"],
                "password_hash": hash_password(s["password"]),
                "name": s["name"],
                "handle": s["handle"],
                "role": s["role"],
                "avatar_url": "",
                "created_at": datetime.now(timezone.utc),
            })
            logger.info(f"[auth] seed criado: {s['email']}")
        elif not verify_password(s["password"], existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": s["email"]},
                {"$set": {"password_hash": hash_password(s["password"])}},
            )
            logger.info(f"[auth] senha atualizada: {s['email']}")
