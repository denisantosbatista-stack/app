from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import json
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
from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration
import base64 as b64
import asyncio

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


def _map_llm_exception(exc: Exception) -> HTTPException:
    """Mapeia exceções do emergentintegrations / upstream LLM para HTTP semânticos.

    - 429: rate-limit detectado por palavras-chave ou status no texto do erro.
    - 402: saldo / quota esgotada (sem créditos no Universal Key).
    - 502: outros erros upstream.
    """
    msg = str(exc) or ""
    low = msg.lower()
    # Rate limit
    if "429" in msg or "rate limit" in low or "too many requests" in low or "ratelimit" in low:
        return HTTPException(
            status_code=429,
            detail="A IA atingiu o limite de requisições. Tente novamente em alguns segundos.",
        )
    # Saldo / quota
    saldo_keys = (
        "402", "insufficient", "quota", "credit", "balance",
        "out of credits", "no credits", "billing", "payment required",
    )
    if any(k in low for k in saldo_keys):
        return HTTPException(
            status_code=402,
            detail="Saldo de gerações esgotado. Recarregue o Universal Key ou faça upgrade.",
        )
    # Autorização
    if "401" in msg or "unauthorized" in low or "invalid api key" in low or "forbidden" in low:
        return HTTPException(
            status_code=402,
            detail="Chave de IA inválida ou expirada.",
        )
    return HTTPException(status_code=502, detail=f"AI generation failed: {msg}")


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


class AIPromptRequest(BaseModel):
    prompt: Optional[str] = ""
    style: Optional[str] = None
    image_base64: Optional[str] = None  # imagem opcional para extração de paleta via visão


class VoiceRequest(BaseModel):
    text: str
    voice: Optional[str] = "nova"  # alloy|ash|coral|echo|fable|nova|onyx|sage|shimmer
    speed: Optional[float] = 1.0


class ImageRequest(BaseModel):
    prompt: str
    colors: Optional[List[str]] = None  # hex strings to guide the palette
    shape: Optional[str] = "gota"  # gota | bandeja | geodo | colar | anel


class VideoRequest(BaseModel):
    color_a: str
    color_b: str
    duration: Optional[int] = 4  # 4 | 8 | 12
    size: Optional[str] = "1280x720"


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "LindArt API online", "version": "1.0"}


@api_router.post("/ai/generate-palette", response_model=Palette)
async def generate_palette_ai(req: AIPromptRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    has_image = bool(req.image_base64)
    has_prompt = bool((req.prompt or "").strip())
    if not has_image and not has_prompt:
        raise HTTPException(status_code=400, detail="Forneça um prompt ou uma imagem de referência.")

    system_msg = (
        "Você é uma especialista em cromática e design de joias de resina epóxi de luxo. "
        + (
            "Dada uma imagem de referência enviada pelo usuário, EXTRAIA as 4 cores dominantes "
            "mais expressivas e harmoniosas para uma peça de resina, transformando-as em uma "
            "paleta refinada (não copie cores feias/sujas — refine a paleta para joalheria). "
            if has_image
            else "Dado um prompt do usuário (em português ou inglês), "
        )
        + "Retorne EXCLUSIVAMENTE um JSON válido "
        "no seguinte formato (sem markdown, sem ```, sem comentários):\n"
        "{\n"
        '  "name": "Nome curto e poético da paleta (3-4 palavras)",\n'
        '  "description": "Uma frase descrevendo o feeling da paleta",\n'
        '  "colors": [\n'
        '    {"hex": "#XXXXXX", "name": "Nome da cor", "role": "principal"},\n'
        '    {"hex": "#XXXXXX", "name": "Nome da cor", "role": "acento"},\n'
        '    {"hex": "#XXXXXX", "name": "Nome da cor", "role": "detalhe"},\n'
        '    {"hex": "#XXXXXX", "name": "Nome da cor", "role": "veios"}\n'
        '  ],\n'
        '  "style": "geodo | marmore | oceano | galaxia | floral | metalico | pastel | boho | luxo | minimalista",\n'
        '  "tags": ["tag1", "tag2", "tag3"]\n'
        "}\n"
        "Regras:\n"
        "- Exatamente 4 cores em HEX válido de 6 caracteres.\n"
        "- Roles: principal, acento, detalhe, veios (nessa ordem).\n"
        "- Harmonia cromática refinada, evite cores genéricas. Pense em joalheria de luxo.\n"
        "- Style deve refletir a estética dominante."
    )

    if has_image:
        user_text = (
            "Analise a imagem anexada e extraia uma paleta de 4 cores refinada inspirada nela. "
            "Foque nas cores dominantes e em acentos que combinem para resina de luxo."
        )
        if has_prompt:
            user_text += f"\nContexto/orientação adicional do usuário: {req.prompt}"
    else:
        user_text = f"Prompt: {req.prompt}"
    if req.style:
        user_text += f"\nEstilo preferido: {req.style}"

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"palette-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    file_contents = None
    if has_image:
        # remove cabeçalho data:image/... se vier
        raw_b64 = req.image_base64
        if "," in raw_b64 and raw_b64.lstrip().startswith("data:"):
            raw_b64 = raw_b64.split(",", 1)[1]
        file_contents = [ImageContent(image_base64=raw_b64)]

    try:
        response = await chat.send_message(
            UserMessage(text=user_text, file_contents=file_contents)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI error: {e!r}")
        raise _map_llm_exception(e)

    # Extract JSON from response
    raw = response.strip()
    # Remove markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise HTTPException(status_code=502, detail="AI returned invalid format")

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {e}")

    # Build Palette
    palette = Palette(
        name=data.get("name", "Paleta IA"),
        description=data.get("description", ""),
        colors=[ColorSwatch(**c) for c in data.get("colors", [])],
        style=data.get("style", "luxo"),
        tags=data.get("tags", []),
        source="ai",
    )
    return palette


@api_router.post("/ai/generate-voice")
async def generate_voice(req: VoiceRequest):
    """Gera narração TTS (OpenAI). Retorna áudio MP3 em base64."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texto vazio")
    if len(text) > 1200:
        text = text[:1200]
    voice = req.voice if req.voice in OpenAITextToSpeech.VOICES else "nova"
    speed = max(0.5, min(2.0, float(req.speed or 1.0)))
    try:
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        # generate_speech is async coroutine
        audio_bytes = await tts.generate_speech(
            text=text, model="tts-1", voice=voice, speed=speed, response_format="mp3"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error: {e!r}")
        raise _map_llm_exception(e)
    if not audio_bytes:
        raise HTTPException(status_code=502, detail="TTS retornou vazio")
    audio_b64 = b64.b64encode(audio_bytes).decode("ascii")
    logger.info(f"TTS ok: voice={voice} len={len(text)} bytes={len(audio_bytes)}")
    return {
        "audio_base64": audio_b64,
        "mime_type": "audio/mpeg",
        "voice": voice,
        "speed": speed,
    }


@api_router.post("/ai/generate-image")
async def generate_image(req: ImageRequest):
    """Gera imagem fotorrealista (Gemini Nano Banana) de peça de resina com a paleta dada."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    colors_part = ""
    if req.colors:
        hex_list = ", ".join(c for c in req.colors if isinstance(c, str))
        colors_part = (
            f" USE EXCLUSIVAMENTE estas cores HEX, sem adicionar outras cores: {hex_list}. "
            "Cada cor da paleta DEVE aparecer visivelmente na peça. "
            "É PROIBIDO substituir, suavizar ou misturar com cores fora desta paleta."
        )
    shape = (req.shape or "gota").lower()
    prompt = (
        f"Fotografia profissional de uma peça artesanal de resina epóxi premium em formato de {shape}. "
        f"{req.prompt}.{colors_part} "
        "Iluminação de estúdio suave, fundo neutro escuro, alto contraste, "
        "reflexos dourados sutis, profundidade de campo rasa, hiper-realista, 4k, joalheria de luxo."
    )

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"image-{uuid.uuid4()}",
            system_message="Você gera imagens fotorrealistas de peças de resina epóxi em estilo joalheria de luxo.",
        )
        .with_model("gemini", "gemini-3.1-flash-image-preview")
        .with_params(modalities=["image", "text"])
    )
    try:
        text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"NanoBanana error: {e!r}")
        raise _map_llm_exception(e)

    if not images:
        raise HTTPException(status_code=502, detail="Nenhuma imagem gerada")
    img = images[0]
    logger.info(f"Nano Banana ok: shape={shape} bytes_b64={len(img.get('data',''))}")
    return {
        "image_base64": img.get("data"),
        "mime_type": img.get("mime_type", "image/png"),
        "caption": (text or "")[:240],
        "shape": shape,
    }


# ===== Sora 2 video — background job store (in-memory) =====
# Evita 502/proxy timeout: o endpoint retorna job_id imediatamente
# e o cliente faz polling em /api/ai/video-status/{job_id}.
_VIDEO_JOBS: dict[str, dict] = {}


def _run_sora_job(job_id: str, prompt: str, size: str, duration: int) -> None:
    """Roda Sora 2 em thread separada e atualiza _VIDEO_JOBS."""
    try:
        video_gen = OpenAIVideoGeneration(api_key=EMERGENT_LLM_KEY)
        video_bytes = video_gen.text_to_video(prompt, "sora-2", size, duration, 600)
        if not video_bytes:
            _VIDEO_JOBS[job_id] = {
                **_VIDEO_JOBS.get(job_id, {}),
                "status": "error",
                "error": "Sora 2 retornou vazio",
            }
            return
        video_b64 = b64.b64encode(video_bytes).decode("ascii")
        _VIDEO_JOBS[job_id] = {
            **_VIDEO_JOBS.get(job_id, {}),
            "status": "completed",
            "video_base64": video_b64,
            "mime_type": "video/mp4",
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }
        logger.info(f"Sora2 job {job_id} ok: bytes={len(video_bytes)}")
    except Exception as e:
        logger.error(f"Sora2 job {job_id} error: {e!r}")
        mapped = _map_llm_exception(e)
        _VIDEO_JOBS[job_id] = {
            **_VIDEO_JOBS.get(job_id, {}),
            "status": "error",
            "error": mapped.detail,
            "http_status": mapped.status_code,
        }


@api_router.post("/ai/generate-video")
async def generate_video(req: VideoRequest, background_tasks: BackgroundTasks):
    """Dispara geração Sora 2 em background. Retorna {job_id} imediatamente.

    O cliente deve fazer polling em GET /api/ai/video-status/{job_id}
    a cada ~5s até receber status == 'completed' (com video_base64) ou 'error'.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    duration = req.duration if req.duration in OpenAIVideoGeneration.DURATIONS else 4
    size = req.size if req.size in OpenAIVideoGeneration.SIZES else "1280x720"
    prompt = (
        f"Macro cinematic shot of two glossy paint colors swirling together on a black studio "
        f"background. Color A is {req.color_a} and color B is {req.color_b}. Slow elegant swirl "
        "with golden specks of mica, creamy paint texture, ultra realistic, shallow depth of "
        "field, soft top lighting, marbling reveal, premium resin art aesthetic."
    )

    job_id = str(uuid.uuid4())
    _VIDEO_JOBS[job_id] = {
        "status": "processing",
        "color_a": req.color_a,
        "color_b": req.color_b,
        "duration": duration,
        "size": size,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(_run_sora_job, job_id, prompt, size, duration)
    logger.info(f"Sora2 job {job_id} queued: dur={duration} size={size}")
    return {"job_id": job_id, "status": "processing"}


@api_router.get("/ai/video-status/{job_id}")
async def video_status(job_id: str):
    """Retorna o status do job Sora 2 e, quando completo, o vídeo em base64."""
    job = _VIDEO_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    status = job.get("status", "processing")
    if status == "completed":
        return {
            "status": "completed",
            "video_base64": job.get("video_base64"),
            "mime_type": job.get("mime_type", "video/mp4"),
            "duration": job.get("duration"),
            "size": job.get("size"),
        }
    if status == "error":
        return {
            "status": "error",
            "detail": job.get("error", "Falha desconhecida"),
            "http_status": job.get("http_status", 502),
        }
    return {
        "status": "processing",
        "started_at": job.get("started_at"),
        "duration": job.get("duration"),
        "size": job.get("size"),
    }


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
