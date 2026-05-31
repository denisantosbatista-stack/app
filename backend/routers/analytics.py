"""Analytics / Alcance — tracking de cliques humanos em links compartilhados.

Endpoints:
- POST /api/analytics/hit              → PÚBLICO (sem auth). Registra um clique
  humano. Filtra bots por User-Agent. A deduplicação por sessão é feita no
  frontend via sessionStorage; aqui apenas registramos o que chega.
- GET  /api/users/me/analytics         → AUTENTICADO. Retorna total de
  cliques, top 5 entidades e timeline dos últimos 30 dias para o usuário
  logado (filtrado por entidades que pertencem a ele).

Coleção: ``analytics_clicks`` com schema mínimo:
  {
    entity_type: "dna" | "feed" | "marketplace" | "profile",
    entity_id:   string,            # id ou handle da entidade
    owner_handle: string | None,    # handle do dono — pré-resolvido na hora
                                    # do hit para queries rápidas
    created_at:   datetime (UTC),
    day:          "YYYY-MM-DD",     # bucket diário para a timeline
    ua_hash:      string,           # short hash do user-agent (debug)
  }
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ._shared import db, normalize_handle
from .auth import get_current_user

logger = logging.getLogger("lindart.analytics")
router = APIRouter(prefix="/api", tags=["analytics"])


# ────────── Bot filter (User-Agent blacklist) ──────────
_BOT_PATTERNS = [
    "googlebot", "bingbot", "facebookexternalhit", "facebot",
    "twitterbot", "telegrambot", "whatsapp", "slackbot",
    "discordbot", "linkedinbot", "yandexbot", "baiduspider",
    "applebot", "ahrefsbot", "semrushbot", "petalbot", "duckduckbot",
    "headlesschrome", "phantomjs", "puppeteer", "playwright",
    "curl/", "wget/", "python-requests", "axios/", "postmanruntime",
    "node-fetch", "go-http-client", "okhttp",
    "embedly", "redditbot", "pinterestbot", "skypeuripreview",
]


def _is_bot(ua: str) -> bool:
    if not ua:
        return True
    low = ua.lower()
    return any(pat in low for pat in _BOT_PATTERNS)


# ────────── entity helpers ──────────
_VALID_ENTITY_TYPES = {"dna", "feed", "marketplace", "profile"}


async def _resolve_owner_handle(entity_type: str, entity_id: str) -> Optional[str]:
    """Descobre o handle do dono da entidade para indexar o hit.

    Sem dono identificável → retorna None (o hit ainda é registrado, mas não
    aparece em nenhum dashboard de usuário).
    """
    try:
        if entity_type == "profile":
            h = normalize_handle(entity_id)
            return h
        if entity_type == "dna":
            doc = await db.dna_shares.find_one({"share_id": entity_id}, {"handle": 1})
            return normalize_handle(doc.get("handle")) if doc else None
        if entity_type == "feed":
            doc = await db.feed_posts.find_one({"id": entity_id}, {"handle": 1})
            return normalize_handle(doc.get("handle")) if doc else None
        if entity_type == "marketplace":
            doc = await db.marketplace_items.find_one({"id": entity_id}, {"handle": 1})
            return normalize_handle(doc.get("handle")) if doc else None
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[analytics] resolve owner: {exc}")
    return None


# ────────── schemas ──────────
class HitIn(BaseModel):
    entity_type: str = Field(..., description="dna | feed | marketplace | profile")
    entity_id: str = Field(..., min_length=1, max_length=200)


# ────────── POST /api/analytics/hit ──────────
@router.post("/analytics/hit")
async def analytics_hit(payload: HitIn, request: Request):
    """Registra um clique humano vindo de ``?ref=share``. PÚBLICO, sem auth.

    Retorna 204 (No Content equivalente) com ``{ok: true}`` para qualquer
    requisição válida — incluindo bots filtrados — para não vazar a lista de
    UAs bloqueados. A deduplicação real é responsabilidade do frontend
    (sessionStorage).
    """
    entity_type = payload.entity_type.lower().strip()
    if entity_type not in _VALID_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="entity_type inválido")

    entity_id = payload.entity_id.strip()
    if not entity_id:
        raise HTTPException(status_code=400, detail="entity_id obrigatório")
    # sanitização leve — permite alfanum + . _ - apenas (compatível com share_id,
    # handle e ids do app). Limite 200 chars já garantido pelo Pydantic.
    if not re.fullmatch(r"[A-Za-z0-9._\-]+", entity_id):
        raise HTTPException(status_code=400, detail="entity_id inválido")

    ua = request.headers.get("user-agent", "")
    if _is_bot(ua):
        return {"ok": True, "tracked": False}

    owner_handle = await _resolve_owner_handle(entity_type, entity_id)
    now = datetime.now(timezone.utc)
    ua_hash = hashlib.sha1(ua.encode("utf-8", errors="ignore")).hexdigest()[:10]

    await db.analytics_clicks.insert_one({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "owner_handle": owner_handle,
        "created_at": now,
        "day": now.strftime("%Y-%m-%d"),
        "ua_hash": ua_hash,
    })
    return {"ok": True, "tracked": True}


# ────────── GET /api/users/me/analytics ──────────
@router.get("/users/me/analytics")
async def my_analytics(user: dict = Depends(get_current_user)):
    """Retorna métricas de alcance do usuário logado.

    - ``total``: cliques totais
    - ``by_entity``: top 5 entidades agregadas (entity_type + entity_id)
      enriquecidas com label/path para a UI.
    - ``timeline``: lista de 30 buckets diários (mais antigo → mais recente)
      com ``date`` e ``count``.
    - ``by_type``: total por tipo de entidade (dna/feed/marketplace/profile).
    """
    handle = normalize_handle(user.get("handle"))
    if not handle:
        return {"total": 0, "by_entity": [], "timeline": [], "by_type": {}}

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)

    # match base: hits onde o owner é o usuário logado OU é um perfil do
    # próprio usuário (entity_type=profile + entity_id=handle).
    match = {
        "$or": [
            {"owner_handle": handle},
            {"entity_type": "profile", "entity_id": handle},
        ],
    }

    total = await db.analytics_clicks.count_documents(match)

    # ---- por tipo ----
    by_type_cursor = db.analytics_clicks.aggregate([
        {"$match": match},
        {"$group": {"_id": "$entity_type", "count": {"$sum": 1}}},
    ])
    by_type = {row["_id"]: row["count"] async for row in by_type_cursor}

    # ---- top 5 entidades ----
    top_cursor = db.analytics_clicks.aggregate([
        {"$match": match},
        {"$group": {
            "_id": {"type": "$entity_type", "id": "$entity_id"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ])
    top_raw = [row async for row in top_cursor]

    by_entity = []
    for row in top_raw:
        et = row["_id"]["type"]
        eid = row["_id"]["id"]
        enriched = await _enrich_entity(et, eid, handle)
        by_entity.append({
            "entity_type": et,
            "entity_id": eid,
            "count": row["count"],
            **enriched,
        })

    # ---- timeline 30 dias ----
    tl_cursor = db.analytics_clicks.aggregate([
        {"$match": {**match, "created_at": {"$gte": cutoff}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
    ])
    counts_by_day = {row["_id"]: row["count"] async for row in tl_cursor}

    timeline = []
    for i in range(29, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        timeline.append({"date": d, "count": counts_by_day.get(d, 0)})

    return {
        "total": total,
        "by_entity": by_entity,
        "timeline": timeline,
        "by_type": by_type,
    }


async def _enrich_entity(entity_type: str, entity_id: str, handle: str) -> dict:
    """Adiciona label legível e caminho público para a UI do top 5."""
    if entity_type == "profile":
        return {"label": f"@{entity_id}", "path": f"/u/{entity_id}"}
    if entity_type == "dna":
        doc = await db.dna_shares.find_one({"share_id": entity_id}, {"signature": 1, "payload": 1})
        sig = None
        if doc:
            sig = doc.get("signature") or (doc.get("payload") or {}).get("signature")
        return {
            "label": (sig or "DNA Visual")[:60],
            "path": f"/dna/{entity_id}",
        }
    if entity_type == "feed":
        doc = await db.feed_posts.find_one({"id": entity_id}, {"title": 1})
        return {
            "label": ((doc or {}).get("title") or "Post do feed")[:60],
            "path": f"/feed?post={entity_id}",
        }
    if entity_type == "marketplace":
        doc = await db.marketplace_items.find_one({"id": entity_id}, {"title": 1})
        return {
            "label": ((doc or {}).get("title") or "Item")[:60],
            "path": f"/marketplace?item={entity_id}",
        }
    return {"label": entity_id, "path": "/"}


# ────────── init: índices ──────────
async def init_analytics():
    try:
        await db.analytics_clicks.create_index("owner_handle")
        await db.analytics_clicks.create_index([("owner_handle", 1), ("created_at", -1)])
        await db.analytics_clicks.create_index([("entity_type", 1), ("entity_id", 1)])
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[analytics] index init: {exc}")
