"""LindArt API — entrypoint enxuto.

Responsável apenas por:
- carregar o ambiente (.env);
- configurar logging e o ciclo de vida (lifespan) do app;
- registrar routers modulares (system, feed, marketplace, profiles,
  challenges, auth, og, svd_video, ai, palettes);
- montar os assets estáticos e o middleware de CORS.

Toda a lógica de negócio mora em ``backend/routers/*``.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ===== Routers =====
from routers.ai import router as ai_router  # noqa: E402
from routers.analytics import init_analytics  # noqa: E402
from routers.analytics import router as analytics_router  # noqa: E402
from routers.auth import init_auth  # noqa: E402
from routers.auth import router as auth_router  # noqa: E402
from routers.challenges import router as challenges_router  # noqa: E402
from routers.feed import router as feed_router  # noqa: E402
from routers.leads import init_leads  # noqa: E402
from routers.leads import router as leads_router  # noqa: E402
from routers.marketplace import router as marketplace_router  # noqa: E402
from routers.og import router as og_router  # noqa: E402
from routers.palettes import router as palettes_router  # noqa: E402
from routers.podcasts import router as podcasts_router  # noqa: E402
from routers.profiles import router as profiles_router  # noqa: E402
from routers.seed_content import ensure_seed_content  # noqa: E402
from routers.svd_video import router as svd_video_router  # noqa: E402
from routers.system import router as system_router  # noqa: E402
from routers.waitlist import init_waitlist  # noqa: E402
from routers.waitlist import router as waitlist_router  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida do app: inicializa auth e fecha o cliente Mongo."""
    await init_auth()
    await init_analytics()
    await init_leads()
    await init_waitlist()
    await ensure_seed_content()
    try:
        yield
    finally:
        client.close()


app = FastAPI(title="LindArt API", lifespan=lifespan)


@app.get("/ping")
async def ping():
    """Healthcheck endpoint para Railway (sem prefixo /api)."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# Registro de routers (ordem importa apenas para legibilidade)
app.include_router(system_router)
app.include_router(feed_router)
app.include_router(marketplace_router)
app.include_router(profiles_router)
app.include_router(challenges_router)
app.include_router(auth_router)
app.include_router(og_router)
app.include_router(svd_video_router)
app.include_router(ai_router)
app.include_router(palettes_router)
app.include_router(analytics_router)
app.include_router(leads_router)
app.include_router(waitlist_router)
app.include_router(podcasts_router)

# Servir uploads de podcasts (áudio + capas) via /api/uploads/...
UPLOADS_PATH = Path("/uploads")
UPLOADS_PATH.mkdir(parents=True, exist_ok=True)
app.mount(
    "/api/uploads",
    StaticFiles(directory=str(UPLOADS_PATH)),
    name="uploads",
)

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
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
