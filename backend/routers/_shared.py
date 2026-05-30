"""Utilidades compartilhadas pelos routers modulares.

- Acesso ao Mongo (mesma instância do server.py para não abrir conexão
  duplicada).
- Helpers de decodificação base64 e persistência de imagens em
  static_assets/.
- Modelos Pydantic compartilhados (Palette, ColorSwatch) usados por
  múltiplos routers (ai, palettes).
"""
from __future__ import annotations

import base64
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# Modelos Pydantic compartilhados (Palette, ColorSwatch)
# Usados por ai.py (geração) e palettes.py (CRUD).
# ============================================================
class ColorSwatch(BaseModel):
    hex: str
    name: str
    role: str  # principal | acento | detalhe | veios


class Palette(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    colors: List[ColorSwatch]
    style: Optional[str] = "classic"
    tags: List[str] = []
    favorite: bool = False
    source: str = "user"  # user | ai | preset
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

ROOT_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT_DIR / "static_assets"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Conexão Mongo reaproveitada — singleton process-level
_mongo_url = os.environ["MONGO_URL"]
_db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(_mongo_url)
db = _client[_db_name]


def normalize_handle(h: Optional[str]) -> Optional[str]:
    """Normaliza o handle: minúsculo, alfanumérico + ._-, máx 32 chars."""
    if not h:
        return None
    h = h.strip().lstrip("@").lower()
    h = re.sub(r"[^a-z0-9._-]", "", h)
    return h[:32] or None


_DATA_URL_RE = re.compile(r"^data:image/([a-zA-Z0-9.+-]+);base64,(.+)$", re.DOTALL)


def save_base64_image(b64: str, subdir: str) -> str:
    """Salva uma imagem base64 (com ou sem prefixo data:) em static_assets/{subdir}/.

    Retorna o path *relativo* à raiz do app, no formato ``/api/static/{subdir}/{file}``.
    """
    m = _DATA_URL_RE.match(b64.strip())
    if m:
        ext = m.group(1).lower()
        raw = m.group(2)
    else:
        ext = "jpg"
        raw = b64
    # Normalizar extensão
    if ext in ("jpeg",):
        ext = "jpg"
    if ext not in ("jpg", "png", "webp", "gif"):
        ext = "jpg"

    out_dir = STATIC_DIR / subdir
    out_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.{ext}"
    path = out_dir / fname
    try:
        data = base64.b64decode(raw)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"base64 inválido: {exc}") from exc
    if len(data) > 8 * 1024 * 1024:
        raise ValueError("imagem maior que 8MB")
    with open(path, "wb") as f:
        f.write(data)
    return f"/api/static/{subdir}/{fname}"
