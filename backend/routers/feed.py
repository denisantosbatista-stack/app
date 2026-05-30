"""Feed estilo Pinterest — descoberta da comunidade.

Endpoints:
- GET    /api/feed                 (lista paginada, mais recentes primeiro)
- POST   /api/feed                 (cria post)
- POST   /api/feed/{id}/like       (incrementa contagem de likes — anônimo)
- DELETE /api/feed/{id}            (apaga post — sem auth, simples)

Como autenticação é mockada, o "autor" é o handle informado no body.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ._shared import db, normalize_handle, save_base64_image

router = APIRouter(prefix="/api/feed", tags=["feed"])


class FeedPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    handle: str
    title: str
    description: Optional[str] = ""
    image_url: str
    palette_colors: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    likes: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FeedPostCreate(BaseModel):
    handle: str
    title: str
    description: Optional[str] = ""
    # exatamente uma destas:
    image_base64: Optional[str] = None  # data URL ou base64 puro
    image_url: Optional[str] = None
    palette_colors: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


@router.get("/pick", response_model=Optional[FeedPost])
async def pick_of_the_week():
    """Pick da Semana — curadoria automática: post com mais likes dos últimos 7 dias.

    Retorna `null` quando não há nenhum post elegível (DB vazio ou sem likes recentes).
    """
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    doc = await db.feed_posts.find_one(
        {"created_at": {"$gte": cutoff}, "likes": {"$gt": 0}},
        {"_id": 0},
        sort=[("likes", -1), ("created_at", -1)],
    )
    if not doc:
        # fallback: post mais recente que tenha qualquer like (ou último publicado)
        doc = await db.feed_posts.find_one(
            {"likes": {"$gt": 0}}, {"_id": 0}, sort=[("likes", -1)]
        ) or await db.feed_posts.find_one(
            {}, {"_id": 0}, sort=[("created_at", -1)]
        )
    return FeedPost(**doc) if doc else None


@router.get("", response_model=List[FeedPost])
async def list_feed(
    handle: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(60, ge=1, le=120),
    skip: int = Query(0, ge=0),
):
    query: dict = {}
    h = normalize_handle(handle)
    if h:
        query["handle"] = h
    if tag:
        query["tags"] = tag.lower()
    cursor = (
        db.feed_posts.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(limit)
    return [FeedPost(**d) for d in docs]


@router.post("", response_model=FeedPost)
async def create_post(req: FeedPostCreate):
    h = normalize_handle(req.handle)
    if not h:
        raise HTTPException(status_code=400, detail="Handle obrigatório (ex: @suaarte)")
    title = (req.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Título obrigatório")
    if len(title) > 120:
        title = title[:120]

    if req.image_base64:
        try:
            image_url = save_base64_image(req.image_base64, "feed")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    elif req.image_url:
        image_url = req.image_url.strip()
    else:
        raise HTTPException(status_code=400, detail="image_base64 ou image_url obrigatório")

    tags = [t.strip().lower() for t in (req.tags or []) if t and t.strip()][:8]
    colors = [c for c in (req.palette_colors or []) if isinstance(c, str) and c.startswith("#")][:8]

    post = FeedPost(
        handle=h,
        title=title,
        description=(req.description or "").strip()[:500],
        image_url=image_url,
        palette_colors=colors,
        tags=tags,
    )
    await db.feed_posts.insert_one(post.model_dump())
    return post


@router.post("/{post_id}/like")
async def like_post(post_id: str):
    result = await db.feed_posts.find_one_and_update(
        {"id": post_id},
        {"$inc": {"likes": 1}},
        projection={"_id": 0, "id": 1, "likes": 1},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return {"id": result["id"], "likes": result["likes"]}


@router.delete("/{post_id}")
async def delete_post(post_id: str, handle: str):
    """Deleta um post — exige o handle correspondente (autoria simples)."""
    h = normalize_handle(handle)
    if not h:
        raise HTTPException(status_code=400, detail="handle obrigatório")
    result = await db.feed_posts.delete_one({"id": post_id, "handle": h})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post não encontrado ou handle não confere")
    return {"deleted": True, "id": post_id}
