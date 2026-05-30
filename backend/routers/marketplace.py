"""Marketplace interno — moldes, cursos, presets, e-books.

Endpoints:
- GET  /api/marketplace                 lista filtrada por type/q          (público)
- POST /api/marketplace                 cria item                          (exige JWT)
- POST /api/marketplace/{id}/click      registra clique externo (analytics) (público)
- DEL  /api/marketplace/{id}            apaga item                         (exige JWT do autor)

O `handle` do item é sempre o do usuário autenticado (campo opcional no body
é ignorado — fica apenas por compatibilidade do schema).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ._shared import db, normalize_handle, save_base64_image
from .auth import get_current_user

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

ALLOWED_TYPES = {"molde", "curso", "preset", "ebook", "ferramenta", "outro"}


class MarketItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    type: str = "outro"
    title: str
    description: Optional[str] = ""
    image_url: str
    price_brl: Optional[float] = None
    currency: str = "BRL"
    link: Optional[str] = None  # URL externa (Hotmart, Instagram, Etsy, etc.)
    handle: str
    verified: bool = False
    tags: List[str] = Field(default_factory=list)
    clicks: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MarketItemCreate(BaseModel):
    type: str = "outro"
    title: str
    description: Optional[str] = ""
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    price_brl: Optional[float] = None
    link: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


@router.get("", response_model=List[MarketItem])
async def list_items(
    type: Optional[str] = None,
    q: Optional[str] = None,
    handle: Optional[str] = None,
    limit: int = Query(60, ge=1, le=120),
    skip: int = Query(0, ge=0),
):
    query: dict = {}
    if type and type in ALLOWED_TYPES:
        query["type"] = type
    h = normalize_handle(handle)
    if h:
        query["handle"] = h
    if q and q.strip():
        # busca simples case-insensitive no título
        query["title"] = {"$regex": q.strip()[:60], "$options": "i"}
    cursor = (
        db.marketplace_items.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(limit)
    return [MarketItem(**d) for d in docs]


@router.post("", response_model=MarketItem)
async def create_item(req: MarketItemCreate, user: dict = Depends(get_current_user)):
    h = normalize_handle(user.get("handle") or "")
    if not h:
        raise HTTPException(status_code=400, detail="Sua conta não possui handle configurado")
    title = (req.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Título obrigatório")
    typ = (req.type or "outro").lower()
    if typ not in ALLOWED_TYPES:
        typ = "outro"

    if req.image_base64:
        try:
            image_url = save_base64_image(req.image_base64, "market")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    elif req.image_url:
        image_url = req.image_url.strip()
    else:
        raise HTTPException(status_code=400, detail="image_base64 ou image_url obrigatório")

    link = (req.link or "").strip() or None
    if link and not (link.startswith("http://") or link.startswith("https://")):
        link = f"https://{link}"

    item = MarketItem(
        type=typ,
        title=title[:120],
        description=(req.description or "").strip()[:600],
        image_url=image_url,
        price_brl=req.price_brl,
        link=link,
        handle=h,
        verified=True,
        tags=[t.strip().lower() for t in (req.tags or []) if t and t.strip()][:8],
    )
    await db.marketplace_items.insert_one(item.model_dump())
    return item


@router.post("/{item_id}/click")
async def register_click(item_id: str):
    result = await db.marketplace_items.find_one_and_update(
        {"id": item_id},
        {"$inc": {"clicks": 1}},
        projection={"_id": 0, "id": 1, "clicks": 1, "link": 1},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return result


@router.delete("/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
    """Apaga item — exige JWT do autor (ou admin)."""
    h = normalize_handle(user.get("handle") or "")
    is_admin = (user.get("role") == "admin")
    query: dict = {"id": item_id}
    if not is_admin:
        if not h:
            raise HTTPException(status_code=400, detail="Sua conta não possui handle configurado")
        query["handle"] = h
    result = await db.marketplace_items.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item não encontrado ou sem permissão")
    return {"deleted": True, "id": item_id}
