"""Router modular para CRUD de paletas e compartilhamento de DNA Visual.

Extraído de server.py em P2 Modularization Phase 2 Step 2 (Fev/2026).

Endpoints expostos (prefix=/api):
- GET    /api/palettes              -> lista paletas (filtro ?favorite=bool)
- POST   /api/palettes              -> cria paleta
- PATCH  /api/palettes/{id}         -> atualiza paleta (name/favorite/tags)
- DELETE /api/palettes/{id}         -> remove paleta
- POST   /api/dna/share             -> snapshot público de DNA Visual
- GET    /api/dna/share/{share_id}  -> recupera snapshot
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from routers._shared import ColorSwatch, Palette, db, normalize_handle

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["palettes"])


# ===== Models locais =====
class PaletteCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    colors: List[ColorSwatch]
    style: Optional[str] = "classic"
    tags: List[str] = []
    favorite: bool = False
    source: str = "user"


class PaletteUpdate(BaseModel):
    name: Optional[str] = None
    favorite: Optional[bool] = None
    tags: Optional[List[str]] = None


class DNAShareIn(BaseModel):
    payload: dict
    handle: Optional[str] = None


# ===== Palettes CRUD =====
@router.get("/palettes", response_model=List[Palette])
async def list_palettes(favorite: Optional[bool] = None):
    query = {}
    if favorite is not None:
        query["favorite"] = favorite
    docs = await db.palettes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Palette(**d) for d in docs]


@router.post("/palettes", response_model=Palette)
async def save_palette(p: PaletteCreate):
    palette = Palette(**p.model_dump())
    await db.palettes.insert_one(palette.model_dump())
    return palette


@router.patch("/palettes/{palette_id}", response_model=Palette)
async def update_palette(palette_id: str, update: PaletteUpdate):
    upd = {k: v for k, v in update.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.palettes.find_one_and_update(
        {"id": palette_id}, {"$set": upd}, return_document=True, projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Palette not found")
    return Palette(**result)


@router.delete("/palettes/{palette_id}")
async def delete_palette(palette_id: str):
    result = await db.palettes.delete_one({"id": palette_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Palette not found")
    return {"deleted": True, "id": palette_id}


# ===== DNA Share =====
@router.post("/dna/share")
async def create_dna_share(req: DNAShareIn):
    """Salva um snapshot do DNA Visual para compartilhamento público."""
    if not req.payload or not isinstance(req.payload, dict):
        raise HTTPException(status_code=400, detail="payload inválido")
    # Hardening: limite de tamanho do payload (~64KB JSON)
    try:
        payload_size = len(json.dumps(req.payload))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="payload não serializável")
    if payload_size > 64 * 1024:
        raise HTTPException(status_code=413, detail="payload muito grande (máx 64KB)")

    # Garantir unique index em id (idempotente)
    try:
        await db.dna_shares.create_index("id", unique=True)
    except Exception:  # noqa: BLE001
        pass

    handle = normalize_handle(req.handle)
    # Compat: server.py truncava handle em 40 chars; _shared.normalize_handle usa 32.
    # Mantemos 32 como novo padrão consolidado.

    # Tenta até 3x em caso de colisão de id (extremamente improvável)
    for _ in range(3):
        share_id = uuid.uuid4().hex[:10]
        doc = {
            "id": share_id,
            "payload": req.payload,
            "handle": handle,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            await db.dna_shares.insert_one(doc)
            return {"id": share_id, "path": f"/dna/{share_id}"}
        except Exception as e:  # noqa: BLE001
            if "duplicate" not in str(e).lower():
                raise
            continue
    raise HTTPException(status_code=500, detail="não foi possível gerar id único")


@router.get("/dna/share/{share_id}")
async def get_dna_share(share_id: str):
    doc = await db.dna_shares.find_one({"id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="DNA não encontrado")
    return doc
