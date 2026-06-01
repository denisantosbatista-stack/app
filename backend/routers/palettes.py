"""Router modular para CRUD de paletas, versionamento e compartilhamento de DNA Visual.

Extraído de server.py em P2 Modularization Phase 2 Step 2 (Fev/2026).
Versionamento (híbrido auto+manual) adicionado em P4 (Fev/2026).

Endpoints expostos (prefix=/api):
- GET    /api/palettes                                  -> lista paletas (filtro ?favorite=bool)
- POST   /api/palettes                                  -> cria paleta
- PATCH  /api/palettes/{id}                             -> atualiza paleta (auto-snapshot da versão anterior)
- DELETE /api/palettes/{id}                             -> remove paleta (e versões)
- GET    /api/palettes/{id}/versions                    -> lista versões (manual primeiro, auto depois)
- POST   /api/palettes/{id}/versions                    -> snapshot manual com label
- POST   /api/palettes/{id}/versions/{version_id}/restore -> restaura versão (auto-snapshot do atual antes)
- DELETE /api/palettes/{id}/versions/{version_id}       -> remove versão (não permite remover a última)
- POST   /api/dna/share                                 -> snapshot público de DNA Visual
- GET    /api/dna/share/{share_id}                      -> recupera snapshot
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from routers._shared import ColorSwatch, Palette, db, normalize_handle

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["palettes"])

# Limite de auto-snapshots mantidos por paleta (FIFO). Snapshots manuais não contam.
AUTO_VERSION_LIMIT = 20


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
    description: Optional[str] = None
    colors: Optional[List[ColorSwatch]] = None
    style: Optional[str] = None
    favorite: Optional[bool] = None
    tags: Optional[List[str]] = None


class DNAShareIn(BaseModel):
    payload: dict
    handle: Optional[str] = None


class PaletteVersionCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=80)


class PaletteVersion(BaseModel):
    model_config = {"extra": "ignore"}
    id: str
    palette_id: str
    version_number: int
    label: str
    kind: str  # "auto" | "manual"
    snapshot: dict
    created_at: str


# ===== Helpers de versionamento =====
_SNAPSHOT_FIELDS = ("name", "description", "colors", "style", "tags")


def _palette_snapshot(doc: dict) -> dict:
    """Extrai apenas os campos versionáveis de um documento de paleta."""
    return {k: doc.get(k) for k in _SNAPSHOT_FIELDS}


async def _next_version_number(palette_id: str) -> int:
    last = await db.palette_versions.find_one(
        {"palette_id": palette_id},
        sort=[("version_number", -1)],
        projection={"version_number": 1, "_id": 0},
    )
    return (last or {}).get("version_number", 0) + 1


async def _create_version(palette_id: str, kind: str, label: str, snapshot: dict) -> dict:
    version_id = uuid.uuid4().hex[:12]
    doc = {
        "id": version_id,
        "palette_id": palette_id,
        "version_number": await _next_version_number(palette_id),
        "label": label,
        "kind": kind,
        "snapshot": snapshot,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.palette_versions.insert_one(doc)
    if kind == "auto":
        await _enforce_auto_limit(palette_id)
    return doc


async def _enforce_auto_limit(palette_id: str) -> None:
    """Mantém apenas os AUTO_VERSION_LIMIT auto-snapshots mais recentes (FIFO)."""
    cursor = db.palette_versions.find(
        {"palette_id": palette_id, "kind": "auto"},
        projection={"_id": 0, "id": 1},
        sort=[("version_number", -1)],
    )
    docs = await cursor.to_list(length=None)
    if len(docs) <= AUTO_VERSION_LIMIT:
        return
    to_delete = [d["id"] for d in docs[AUTO_VERSION_LIMIT:]]
    if to_delete:
        await db.palette_versions.delete_many({"id": {"$in": to_delete}})


def _version_out(doc: dict) -> dict:
    """Remove `_id` e retorna apenas chaves públicas."""
    return {
        "id": doc["id"],
        "palette_id": doc["palette_id"],
        "version_number": doc["version_number"],
        "label": doc["label"],
        "kind": doc["kind"],
        "snapshot": doc["snapshot"],
        "created_at": doc["created_at"],
    }


# ===== Palettes CRUD =====
_HEX_NAME_RE = re.compile(r"#[0-9A-Fa-f]{3,6}")
_TEST_NAME_RE = re.compile(r"^\s*(test|teste|saved|temp|tmp|lorem)\b", re.IGNORECASE)


def _sanitize_palette_name(name: str) -> str:
    """Substitui nomes contendo códigos hex por 'Mistura Personalizada'."""
    if not name:
        return name
    if _HEX_NAME_RE.search(name):
        return "Mistura Personalizada"
    return name


def _is_test_palette(doc: dict) -> bool:
    """Marca como teste se source=='test' ou nome começa com prefixos de teste."""
    if (doc.get("source") or "").lower() == "test":
        return True
    name = doc.get("name") or ""
    return bool(_TEST_NAME_RE.match(name))


def _hex_key(doc: dict) -> tuple:
    """Tupla dos 4 primeiros hex em uppercase — chave de deduplicação."""
    colors = doc.get("colors") or []
    return tuple((c.get("hex") or "").upper() for c in colors[:4])


@router.get("/palettes", response_model=List[Palette])
async def list_palettes(favorite: Optional[bool] = None):
    query = {}
    if favorite is not None:
        query["favorite"] = favorite
    docs = await db.palettes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    # 1) sanitiza nomes legados com hex codes
    for d in docs:
        d["name"] = _sanitize_palette_name(d.get("name") or "")

    # 2) filtra paletas de teste
    docs = [d for d in docs if not _is_test_palette(d)]

    # 3) dedup por tupla exata dos 4 hex — mantém a com mais saves
    deduped: dict = {}
    for d in docs:
        key = _hex_key(d)
        if len(key) < 4 or any(not h for h in key):
            # paletas com menos de 4 cores válidas: mantém todas (chave única por id)
            deduped[("__noid__", d.get("id"))] = d
            continue
        current = deduped.get(key)
        if current is None or (d.get("saves") or 0) > (current.get("saves") or 0):
            deduped[key] = d

    # 4) ordena por saves desc (fallback created_at desc já vem do find)
    result = sorted(deduped.values(), key=lambda x: x.get("saves") or 0, reverse=True)
    return [Palette(**d) for d in result]


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

    current = await db.palettes.find_one({"id": palette_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Palette not found")

    # Auto-snapshot do estado atual apenas se algum campo versionável mudou
    versionable_changed = any(
        key in upd and upd[key] != current.get(key) for key in _SNAPSHOT_FIELDS
    )
    if versionable_changed:
        await _create_version(
            palette_id=palette_id,
            kind="auto",
            label=f"Auto-snapshot {datetime.now(timezone.utc).strftime('%d/%m %H:%M')}",
            snapshot=_palette_snapshot(current),
        )

    # Pydantic ColorSwatch precisa ser serializado para dict ao persistir no Mongo
    if "colors" in upd and upd["colors"]:
        upd["colors"] = [c.model_dump() if hasattr(c, "model_dump") else c for c in upd["colors"]]

    result = await db.palettes.find_one_and_update(
        {"id": palette_id}, {"$set": upd}, return_document=True, projection={"_id": 0}
    )
    return Palette(**result)


@router.delete("/palettes/{palette_id}")
async def delete_palette(palette_id: str):
    result = await db.palettes.delete_one({"id": palette_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Palette not found")
    # Limpa versões órfãs
    await db.palette_versions.delete_many({"palette_id": palette_id})
    return {"deleted": True, "id": palette_id}


# ===== Versionamento =====
@router.get("/palettes/{palette_id}/versions")
async def list_palette_versions(palette_id: str):
    palette = await db.palettes.find_one({"id": palette_id}, {"_id": 0, "id": 1})
    if not palette:
        raise HTTPException(status_code=404, detail="Palette not found")
    # Manual primeiro (kind asc: "auto" < "manual" alfabético — invertemos com sort customizado)
    cursor = db.palette_versions.find(
        {"palette_id": palette_id}, projection={"_id": 0}
    ).sort([("created_at", -1)])
    docs = await cursor.to_list(length=None)
    # Reordena: manual primeiro, depois auto, ambos por data desc (já vem ordenado por created_at)
    manual = [_version_out(d) for d in docs if d.get("kind") == "manual"]
    auto = [_version_out(d) for d in docs if d.get("kind") == "auto"]
    return {"palette_id": palette_id, "versions": manual + auto, "total": len(manual) + len(auto)}


@router.post("/palettes/{palette_id}/versions")
async def create_palette_version(palette_id: str, body: PaletteVersionCreate):
    current = await db.palettes.find_one({"id": palette_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Palette not found")
    doc = await _create_version(
        palette_id=palette_id,
        kind="manual",
        label=body.label.strip(),
        snapshot=_palette_snapshot(current),
    )
    return _version_out(doc)


@router.post("/palettes/{palette_id}/versions/{version_id}/restore", response_model=Palette)
async def restore_palette_version(palette_id: str, version_id: str):
    current = await db.palettes.find_one({"id": palette_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Palette not found")
    version = await db.palette_versions.find_one(
        {"id": version_id, "palette_id": palette_id}, {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Auto-snapshot do estado atual antes de restaurar
    await _create_version(
        palette_id=palette_id,
        kind="auto",
        label=f"Antes de restaurar v{version['version_number']}",
        snapshot=_palette_snapshot(current),
    )

    snapshot = version["snapshot"]
    upd = {k: v for k, v in snapshot.items() if v is not None}
    result = await db.palettes.find_one_and_update(
        {"id": palette_id}, {"$set": upd}, return_document=True, projection={"_id": 0}
    )
    return Palette(**result)


@router.delete("/palettes/{palette_id}/versions/{version_id}")
async def delete_palette_version(palette_id: str, version_id: str):
    total = await db.palette_versions.count_documents({"palette_id": palette_id})
    if total <= 1:
        raise HTTPException(
            status_code=400, detail="Não é possível remover a última versão da paleta"
        )
    result = await db.palette_versions.delete_one(
        {"id": version_id, "palette_id": palette_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"deleted": True, "id": version_id}


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
