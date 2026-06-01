"""Podcasts — upload, publicação e listagem pública.

Endpoints (todos sob /api/podcasts):
- POST   /upload              → admin: cria episódio (multipart) — começa não publicado
- PATCH  /{id}/publicar       → admin: alterna/define `publicado`
- GET    /                    → público: lista episódios publicados (limit, q, tag)
- GET    /{id}                → público: detalhe de episódio publicado

Arquivos:
- Áudio em ``/uploads/podcasts/audio/``
- Capa em  ``/uploads/podcasts/capas/``
- Servidos via ``/api/uploads/...`` (StaticFiles montado em server.py).
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import BaseModel

from ._shared import db
from .auth import get_current_user

logger = logging.getLogger("lindart.podcasts")

router = APIRouter(prefix="/api/podcasts", tags=["podcasts"])

# /uploads na raiz do repositório (ao lado de /app/backend)
UPLOADS_DIR = Path("/uploads")
AUDIO_DIR = UPLOADS_DIR / "podcasts" / "audio"
CAPAS_DIR = UPLOADS_DIR / "podcasts" / "capas"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
CAPAS_DIR.mkdir(parents=True, exist_ok=True)

MAX_AUDIO_MB = 80
MAX_CAPA_MB = 5
ALLOWED_AUDIO_EXT = {".mp3", ".m4a", ".wav", ".ogg", ".aac"}
ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}


# ---------- helpers ----------

def _require_admin(user: dict) -> None:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")


def _safe_ext(filename: str, allowed: set[str]) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Extensão inválida. Permitidas: {', '.join(sorted(allowed))}",
        )
    return ext


async def _save_upload(file: UploadFile, dest_dir: Path, allowed: set[str], max_mb: int) -> str:
    ext = _safe_ext(file.filename, allowed)
    fname = f"{uuid.uuid4().hex}{ext}"
    out = dest_dir / fname
    size = 0
    max_bytes = max_mb * 1024 * 1024
    with open(out, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                f.close()
                try:
                    out.unlink()
                except OSError:
                    pass
                raise HTTPException(
                    status_code=413, detail=f"Arquivo excede {max_mb}MB"
                )
            f.write(chunk)
    # URL pública via StaticFiles
    rel = out.relative_to(UPLOADS_DIR).as_posix()
    return f"/api/uploads/{rel}"


def _parse_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    parts = re.split(r"[,;]+", raw)
    out = []
    for p in parts:
        t = p.strip().lower()
        if t and t not in out:
            out.append(t)
    return out[:20]


def _serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "titulo": doc.get("titulo", ""),
        "resineira": doc.get("resineira", ""),
        "descricao": doc.get("descricao", ""),
        "audio_url": doc.get("audio_url", ""),
        "capa_url": doc.get("capa_url", ""),
        "duracao_segundos": int(doc.get("duracao_segundos") or 0),
        "publicado": bool(doc.get("publicado", False)),
        "criado_em": (
            doc["criado_em"].isoformat()
            if isinstance(doc.get("criado_em"), datetime)
            else doc.get("criado_em")
        ),
        "tags": doc.get("tags", []) or [],
    }


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Podcast não encontrado")


# ---------- schemas ----------

class PublicarIn(BaseModel):
    publicado: Optional[bool] = None  # None = toggle


# ---------- endpoints ----------

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_podcast(
    titulo: str = Form(...),
    resineira: str = Form(...),
    descricao: str = Form(""),
    duracao_segundos: int = Form(0),
    tags: str = Form(""),
    audio: UploadFile = File(...),
    capa: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    titulo = titulo.strip()
    resineira = resineira.strip()
    if not titulo or not resineira:
        raise HTTPException(status_code=400, detail="titulo e resineira são obrigatórios")

    audio_url = await _save_upload(audio, AUDIO_DIR, ALLOWED_AUDIO_EXT, MAX_AUDIO_MB)
    capa_url = await _save_upload(capa, CAPAS_DIR, ALLOWED_IMG_EXT, MAX_CAPA_MB)

    doc = {
        "titulo": titulo,
        "resineira": resineira,
        "descricao": (descricao or "").strip(),
        "audio_url": audio_url,
        "capa_url": capa_url,
        "duracao_segundos": max(0, int(duracao_segundos or 0)),
        "publicado": False,
        "criado_em": datetime.now(timezone.utc),
        "tags": _parse_tags(tags),
    }
    res = await db.podcasts.insert_one(doc)
    doc["_id"] = res.inserted_id
    logger.info(f"[podcasts] upload por {user.get('email')}: {titulo}")
    return _serialize(doc)


@router.patch("/{podcast_id}/publicar")
async def publicar_podcast(
    podcast_id: str,
    payload: PublicarIn,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    oid = _oid(podcast_id)
    doc = await db.podcasts.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Podcast não encontrado")
    novo = (
        payload.publicado
        if payload.publicado is not None
        else not bool(doc.get("publicado", False))
    )
    await db.podcasts.update_one({"_id": oid}, {"$set": {"publicado": bool(novo)}})
    doc["publicado"] = bool(novo)
    return _serialize(doc)


@router.get("")
async def listar_podcasts(
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Busca em título/resineira"),
    tag: Optional[str] = Query(None),
):
    filt: dict = {"publicado": True}
    if tag:
        filt["tags"] = tag.strip().lower()
    if q:
        regex = {"$regex": re.escape(q.strip()), "$options": "i"}
        filt["$or"] = [{"titulo": regex}, {"resineira": regex}, {"descricao": regex}]
    cursor = db.podcasts.find(filt).sort("criado_em", -1).limit(limit)
    return [_serialize(d) async for d in cursor]


@router.get("/{podcast_id}")
async def detalhe_podcast(podcast_id: str):
    oid = _oid(podcast_id)
    doc = await db.podcasts.find_one({"_id": oid, "publicado": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Podcast não encontrado")
    return _serialize(doc)
