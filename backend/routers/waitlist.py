"""Wait-list pública — captura leads categorizados (anéis, luminárias, etc.).

Endpoints:
- POST /api/waitlist                    → PÚBLICO. Cria entrada idempotente
  (email + categoria são únicos). Retorna {ok, created}.
- GET  /api/waitlist/count?categoria=X  → PÚBLICO. Total de inscritos numa
  categoria (ou no geral se categoria=all).

Coleção: ``waitlist`` com schema:
  {
    email: str (lowercase, trimmed),
    categoria: str (slug — aneis/luminarias/bandejas/geodo/pingentes/outros),
    nome: str | None,
    timestamp: datetime (UTC),
    ip: str | None,
  }
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field

from ._shared import db

logger = logging.getLogger("lindart.waitlist")
router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


VALID_CATEGORIAS = {"aneis", "luminarias", "bandejas", "geodo", "pingentes", "outros"}
_CATEGORIA_RE = re.compile(r"[a-z0-9]{2,30}")


def _normalize_categoria(raw: Optional[str]) -> str:
    """Normaliza categoria para slug minúsculo. Inválida → 'outros'."""
    if not raw or not isinstance(raw, str):
        return "outros"
    slug = raw.strip().lower()
    # Remove acentos manualmente nas mais comuns
    slug = (
        slug.replace("á", "a").replace("â", "a").replace("ã", "a").replace("à", "a")
        .replace("é", "e").replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o").replace("ô", "o").replace("õ", "o")
        .replace("ú", "u").replace("ü", "u")
        .replace("ç", "c")
    )
    if not _CATEGORIA_RE.fullmatch(slug):
        return "outros"
    if slug not in VALID_CATEGORIAS:
        return "outros"
    return slug


class WaitlistIn(BaseModel):
    email: EmailStr
    categoria: str = Field(..., min_length=1, max_length=40)
    nome: Optional[str] = Field(default=None, max_length=80)


@router.post("")
async def waitlist_subscribe(payload: WaitlistIn, request: Request):
    """Inscreve um email numa categoria. Idempotente: o mesmo email+categoria
    nunca duplica. Retorna ``{ok: true, created: bool}``.
    """
    email = payload.email.strip().lower()
    categoria = _normalize_categoria(payload.categoria)
    nome = (payload.nome or "").strip()[:80] or None
    ip = (request.client.host if request.client else None) or request.headers.get(
        "x-forwarded-for", ""
    ).split(",")[0].strip() or None

    try:
        existing = await db.waitlist.find_one(
            {"email": email, "categoria": categoria}, {"_id": 1}
        )
        if existing:
            return {"ok": True, "created": False, "categoria": categoria}

        await db.waitlist.insert_one({
            "email": email,
            "categoria": categoria,
            "nome": nome,
            "timestamp": datetime.now(timezone.utc),
            "ip": ip,
        })
        return {"ok": True, "created": True, "categoria": categoria}
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[waitlist] insert falhou: {exc}")
        # Mantemos 500 só quando o Mongo realmente não responde — o frontend
        # deve mostrar erro genérico nesse caso.
        raise HTTPException(status_code=500, detail="Não foi possível salvar agora.")


@router.get("/count")
async def waitlist_count(
    categoria: str = Query(default="all", min_length=1, max_length=40),
):
    """Conta inscritos numa categoria. ``categoria=all`` retorna o total geral."""
    cat = (categoria or "").strip().lower()
    try:
        if cat in ("all", "todas", "todos", ""):
            total = await db.waitlist.count_documents({})
            return {"ok": True, "categoria": "all", "count": int(total)}
        normalized = _normalize_categoria(cat)
        total = await db.waitlist.count_documents({"categoria": normalized})
        return {"ok": True, "categoria": normalized, "count": int(total)}
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[waitlist] count falhou: {exc}")
        return {"ok": True, "categoria": cat, "count": 0}


async def init_waitlist():
    """Cria índice único (email, categoria) para garantir idempotência."""
    try:
        await db.waitlist.create_index(
            [("email", 1), ("categoria", 1)], unique=True, name="uniq_email_categoria"
        )
        await db.waitlist.create_index("categoria")
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[waitlist] index init: {exc}")
