from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import json
import time
import logging
import re
import zipfile
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai.text_to_speech import OpenAITextToSpeech
from emergentintegrations.llm.openai import OpenAISpeechToText
import base64 as b64
import asyncio
import math
import urllib.request
from PIL import Image, ImageDraw, ImageFilter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="LindArt API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



# ===== Models =====
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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


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



# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "LindArt API online", "version": "1.0"}





class DNAShareIn(BaseModel):
    payload: dict
    handle: Optional[str] = None


@api_router.post("/dna/share")
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

    # Normaliza handle (remove @ extra, mantém só [a-z0-9._-])
    raw_handle = (req.handle or "").strip().lstrip("@").lower()
    raw_handle = re.sub(r"[^a-z0-9._-]", "", raw_handle)[:40]
    handle = raw_handle or None

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


@api_router.get("/dna/share/{share_id}")
async def get_dna_share(share_id: str):
    doc = await db.dna_shares.find_one({"id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="DNA não encontrado")
    return doc



@api_router.get("/palettes", response_model=List[Palette])
async def list_palettes(favorite: Optional[bool] = None):
    query = {}
    if favorite is not None:
        query["favorite"] = favorite
    docs = await db.palettes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Palette(**d) for d in docs]


@api_router.post("/palettes", response_model=Palette)
async def save_palette(p: PaletteCreate):
    palette = Palette(**p.model_dump())
    await db.palettes.insert_one(palette.model_dump())
    return palette


@api_router.patch("/palettes/{palette_id}", response_model=Palette)
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


@api_router.delete("/palettes/{palette_id}")
async def delete_palette(palette_id: str):
    result = await db.palettes.delete_one({"id": palette_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Palette not found")
    return {"deleted": True, "id": palette_id}


# ===== Source code download =====
# Diretórios e arquivos a ignorar ao zipar (segurança + tamanho).
_ZIP_EXCLUDE_DIRS = {
    "node_modules", ".git", ".next", ".cache", "build", "dist",
    "__pycache__", ".pytest_cache", ".venv", "venv", ".idea", ".vscode",
    ".emergent", "coverage", ".yarn", ".turbo",
}
_ZIP_EXCLUDE_FILES = {
    ".env", ".env.local", ".env.production", ".env.development",
    ".DS_Store", "yarn-error.log", "npm-debug.log",
}
_ZIP_EXCLUDE_SUFFIX = (".pyc", ".pyo", ".log", ".lock.tmp")
_APP_ROOT = Path("/app")
_ZIP_INCLUDE_DIRS = ["backend", "frontend"]
_ZIP_INCLUDE_TOP_FILES = ["README.md", "design_guidelines.json"]


def _should_skip(path: Path) -> bool:
    parts = set(path.parts)
    if parts & _ZIP_EXCLUDE_DIRS:
        return True
    if path.name in _ZIP_EXCLUDE_FILES:
        return True
    if path.suffix in _ZIP_EXCLUDE_SUFFIX:
        return True
    return False


def _build_source_zip() -> io.BytesIO:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        # incluir diretórios principais
        for top in _ZIP_INCLUDE_DIRS:
            base = _APP_ROOT / top
            if not base.exists():
                continue
            for root, dirs, files in os.walk(base):
                # filtra diretórios in-place para o os.walk não descer neles
                dirs[:] = [d for d in dirs if d not in _ZIP_EXCLUDE_DIRS]
                root_path = Path(root)
                for fname in files:
                    fpath = root_path / fname
                    rel = fpath.relative_to(_APP_ROOT)
                    if _should_skip(rel):
                        continue
                    try:
                        zf.write(fpath, arcname=str(rel))
                    except (OSError, ValueError) as e:
                        logger.warning(f"zip skip {fpath}: {e}")
        # arquivos do topo
        for fname in _ZIP_INCLUDE_TOP_FILES:
            fpath = _APP_ROOT / fname
            if fpath.exists() and fpath.is_file():
                zf.write(fpath, arcname=fname)
        # README explicativo do pacote
        readme = (
            "# LindArt — código-fonte\n\n"
            "Pacote gerado automaticamente em "
            f"{datetime.now(timezone.utc).isoformat()}.\n\n"
            "## Como rodar\n\n"
            "### Backend (FastAPI)\n"
            "```bash\n"
            "cd backend\n"
            "pip install -r requirements.txt\n"
            "# crie um arquivo .env com:\n"
            "# MONGO_URL=mongodb://localhost:27017\n"
            "# DB_NAME=lindart\n"
            "# EMERGENT_LLM_KEY=sua_chave\n"
            "uvicorn server:app --reload --port 8001\n"
            "```\n\n"
            "### Frontend (React)\n"
            "```bash\n"
            "cd frontend\n"
            "yarn install\n"
            "# crie um arquivo .env com:\n"
            "# REACT_APP_BACKEND_URL=http://localhost:8001\n"
            "yarn start\n"
            "```\n\n"
            "Os arquivos `.env` foram **removidos** deste ZIP por segurança.\n"
        )
        zf.writestr("LINDART_README.md", readme)
    buf.seek(0)
    return buf


@api_router.get("/download/source")
async def download_source_code():
    """Gera um ZIP do código-fonte do LindArt (backend + frontend) sem segredos."""
    try:
        buf = _build_source_zip()
    except Exception as e:
        logger.exception("zip build failed")
        raise HTTPException(status_code=500, detail=f"Falha ao gerar ZIP: {e}")
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"lindart-source-{ts}.zip"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store",
    }
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/zip",
        headers=headers,
    )


app.include_router(api_router)

# Routers modulares (P2 — feed, marketplace, perfis públicos, desafios)
from routers.feed import router as feed_router  # noqa: E402
from routers.marketplace import router as marketplace_router  # noqa: E402
from routers.profiles import router as profiles_router  # noqa: E402
from routers.challenges import router as challenges_router  # noqa: E402
from routers.auth import router as auth_router, init_auth  # noqa: E402
from routers.og import router as og_router  # noqa: E402
from routers.svd_video import router as svd_video_router  # noqa: E402
from routers.ai import router as ai_router  # noqa: E402

app.include_router(feed_router)
app.include_router(marketplace_router)
app.include_router(profiles_router)
app.include_router(challenges_router)
app.include_router(auth_router)
app.include_router(og_router)
app.include_router(svd_video_router)
app.include_router(ai_router)


@app.on_event("startup")
async def _startup_auth():
    await init_auth()

# Servir vídeos/imagens estáticos do onboarding (montado dentro do prefixo /api
# para passar pelo proxy do ingress).
app.mount(
    "/api/static",
    StaticFiles(directory=str(ROOT_DIR / "static_assets")),
    name="static_assets",
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
