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
import fal_client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
FAL_KEY = os.environ.get('FAL_KEY')
if FAL_KEY:
    # fal_client lê de os.environ['FAL_KEY'] — garantir disponibilidade
    os.environ['FAL_KEY'] = FAL_KEY

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


def _parse_llm_json(raw_text: str) -> Optional[dict]:
    """Parser tolerante para JSON retornado por LLMs.

    LLMs ocasionalmente produzem:
    - markdown fences (```json ... ```)
    - texto antes/depois do JSON
    - aspas não escapadas dentro de strings
    - vírgulas finais (trailing commas)
    - aspas tipográficas (curly quotes)

    Retorna dict em caso de sucesso ou None se nenhuma estratégia funcionar.
    Nunca lança exceção — o caller deve ter fallback determinístico.
    """
    if not raw_text:
        return None
    text = raw_text.strip()
    # Remove markdown fences
    text = re.sub(r"^```(?:json|JSON)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # Normaliza curly quotes
    text = (
        text.replace("\u201c", '"').replace("\u201d", '"')
            .replace("\u2018", "'").replace("\u2019", "'")
    )
    # Extrai bloco {...} principal
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    candidate = match.group(0)

    # Tentativa 1: parse direto
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    # Tentativa 2: remove trailing commas
    repaired = re.sub(r",(\s*[}\]])", r"\1", candidate)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass

    # Tentativa 3: escapa aspas duplas internas dentro de strings JSON.
    # Heurística: para cada par de aspas que abre/fecha uma string, escapa as
    # aspas duplas internas que não sejam seguidas de , : } ] (final de valor).
    def _escape_inner_quotes(src: str) -> str:
        out = []
        i = 0
        in_str = False
        escape_next = False
        while i < len(src):
            ch = src[i]
            if not in_str:
                out.append(ch)
                if ch == '"':
                    in_str = True
            else:
                if escape_next:
                    out.append(ch)
                    escape_next = False
                elif ch == "\\":
                    out.append(ch)
                    escape_next = True
                elif ch == '"':
                    # Olha próximo caractere não-espaço para decidir se é fim de string
                    j = i + 1
                    while j < len(src) and src[j] in " \t\r\n":
                        j += 1
                    nxt = src[j] if j < len(src) else ""
                    if nxt in (",", ":", "}", "]", ""):
                        out.append(ch)
                        in_str = False
                    else:
                        # Aspa interna não escapada — escapar
                        out.append("\\\"")
                else:
                    out.append(ch)
            i += 1
        return "".join(out)

    try:
        return json.loads(_escape_inner_quotes(repaired))
    except json.JSONDecodeError:
        pass

    # Tentativa 4: substituir quebras de linha cruas dentro de strings por \n
    # (LLMs às vezes deixam newlines literais dentro de strings JSON)
    def _escape_newlines_in_strings(src: str) -> str:
        out = []
        in_str = False
        escape_next = False
        for ch in src:
            if not in_str:
                out.append(ch)
                if ch == '"':
                    in_str = True
            else:
                if escape_next:
                    out.append(ch)
                    escape_next = False
                elif ch == "\\":
                    out.append(ch)
                    escape_next = True
                elif ch == '"':
                    out.append(ch)
                    in_str = False
                elif ch == "\n":
                    out.append("\\n")
                elif ch == "\r":
                    out.append("\\r")
                elif ch == "\t":
                    out.append("\\t")
                else:
                    out.append(ch)
        return "".join(out)

    try:
        return json.loads(_escape_newlines_in_strings(repaired))
    except json.JSONDecodeError:
        pass

    try:
        return json.loads(_escape_inner_quotes(_escape_newlines_in_strings(repaired)))
    except json.JSONDecodeError:
        return None


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


class CaptionRequest(BaseModel):
    palette_name: Optional[str] = None
    colors: List[str] = []  # hex
    piece: Optional[str] = "joia de resina"
    style: Optional[str] = None
    platform: Optional[str] = "instagram"  # instagram | tiktok | etsy
    tone: Optional[str] = "luxuoso"  # luxuoso | poetico | divertido | minimalista
    language: Optional[str] = "pt-BR"


class LuxuryScoreRequest(BaseModel):
    palette_name: Optional[str] = None
    colors: List[str] = []  # hex
    description: Optional[str] = ""
    style: Optional[str] = None


class VisualDNARequest(BaseModel):
    """Analisa um conjunto de paletas (geralmente salvas pelo usuário)
    e retorna a 'linguagem visual' / assinatura estética dele.
    """
    palettes: List[dict] = []  # cada item: {name, colors[], style?, tags?, favorite?}
    handle: Optional[str] = None  # opcional, para futuro perfil público


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
    data = _parse_llm_json(raw)
    if not data:
        logger.error(f"Palette AI: parser falhou. Raw (200ch): {raw[:200]!r}")
        raise HTTPException(status_code=502, detail="A IA retornou um formato inesperado. Tente novamente.")

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


# Whisper STT — transcrição de áudio do navegador (voz → texto).
# Aceita arquivo de áudio em webm/mp3/wav/m4a. Limite 25MB (limite do Whisper).
_MAX_AUDIO_BYTES = 25 * 1024 * 1024
_AUDIO_EXTS_MAP = {
    "audio/webm": "webm",
    "audio/ogg": "webm",  # alguns navegadores rotulam webm/opus como ogg
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
}


@api_router.post("/ai/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default="pt"),
):
    """Transcreve áudio enviado pelo navegador (Whisper-1).

    Recebe multipart `file` (audio/webm, audio/mp3, audio/wav, audio/m4a).
    Retorna `{ text }` em PT-BR por padrão. Limite 25MB.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    content_type = (file.content_type or "").lower()
    ext = _AUDIO_EXTS_MAP.get(content_type)
    if not ext:
        # tenta inferir pela extensão do filename
        fname = (file.filename or "").lower()
        for e in ("webm", "mp3", "mp4", "m4a", "wav"):
            if fname.endswith("." + e):
                ext = e
                break
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Formato de áudio não suportado. Use webm, mp3, mp4, m4a ou wav.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Áudio vazio")
    if len(raw) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Áudio excede 25MB")

    # Whisper SDK espera um file-like com nome (extensão é usada para detecção do formato).
    buf = io.BytesIO(raw)
    buf.name = f"audio.{ext}"

    lang = (language or "pt").strip().lower()[:5] or "pt"
    try:
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        response = await stt.transcribe(
            file=buf,
            model="whisper-1",
            response_format="json",
            language=lang,
            temperature=0.0,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Whisper error: {e!r}")
        raise _map_llm_exception(e)

    text = getattr(response, "text", None) or ""
    if isinstance(response, dict):
        text = response.get("text", "") or text
    text = (text or "").strip()
    logger.info(f"Whisper ok: lang={lang} bytes={len(raw)} chars={len(text)}")
    return {"text": text, "language": lang, "bytes": len(raw)}


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


# ===== Stable Video Diffusion 2.0 (fal.ai) — background job store (in-memory) =====
# Substitui Sora 2. Mantém o mesmo contrato HTTP para o frontend:
# POST /api/ai/generate-video → {job_id}; GET /api/ai/video-status/{id} → polling.
_VIDEO_JOBS: dict[str, dict] = {}
_VIDEO_JOB_TTL_SECONDS = 3600  # 1h: jobs concluídos/com erro são limpos depois disso
_VIDEO_JOBS_MAX = 200  # hard cap para evitar leak de memória
SVD_MODEL = "fal-ai/stable-video"  # Stable Video Diffusion 2.0 hospedado no fal.ai
SVD_DEFAULT_SIZE = (1024, 576)  # 16:9, dentro do range suportado pelo SVD


def _cleanup_video_jobs() -> None:
    """Remove jobs antigos (terminados há mais de TTL) ou enxuga se passar do cap."""
    now = time.time()
    to_remove: list[str] = []
    for jid, job in _VIDEO_JOBS.items():
        fin = job.get("finished_at_ts")
        if fin and (now - fin) > _VIDEO_JOB_TTL_SECONDS:
            to_remove.append(jid)
    for jid in to_remove:
        _VIDEO_JOBS.pop(jid, None)
    # Hard cap: remove os mais antigos primeiro
    if len(_VIDEO_JOBS) > _VIDEO_JOBS_MAX:
        sorted_jobs = sorted(
            _VIDEO_JOBS.items(),
            key=lambda kv: kv[1].get("finished_at_ts") or kv[1].get("started_at_ts") or 0,
        )
        for jid, _ in sorted_jobs[: len(_VIDEO_JOBS) - _VIDEO_JOBS_MAX]:
            _VIDEO_JOBS.pop(jid, None)


def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = (h or "").lstrip("#").strip()
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        return (200, 180, 120)
    try:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except ValueError:
        return (200, 180, 120)


def _make_swirl_image_png(color_a: str, color_b: str, size: tuple[int, int] = SVD_DEFAULT_SIZE) -> bytes:
    """Gera um PNG cinematográfico de swirl entre duas cores — usado como
    frame-inicial para o Stable Video Diffusion 2.0 animar."""
    w, h = size
    img = Image.new("RGB", size, (10, 10, 12))
    draw = ImageDraw.Draw(img)
    ra = _hex_to_rgb(color_a)
    rb = _hex_to_rgb(color_b)
    cx, cy = w / 2.0, h / 2.0
    radius = min(w, h) * 0.42
    # Desenha 2 blobs grandes
    for cx_b, cy_b, rgb in (
        (cx - radius * 0.45, cy - radius * 0.15, ra),
        (cx + radius * 0.45, cy + radius * 0.15, rb),
    ):
        draw.ellipse(
            (cx_b - radius, cy_b - radius, cx_b + radius, cy_b + radius),
            fill=rgb,
        )
    # Veios dourados (mica)
    gold = (212, 175, 55)
    for i in range(160):
        ang = (i / 160.0) * 2 * math.pi * 3
        rr = radius * (0.4 + 0.55 * ((i * 13) % 100) / 100.0)
        x = int(cx + math.cos(ang) * rr + ((i * 37) % 17 - 8))
        y = int(cy + math.sin(ang * 1.4) * rr * 0.85 + ((i * 53) % 19 - 9))
        sz = 1 + (i % 3)
        draw.ellipse((x - sz, y - sz, x + sz, y + sz), fill=gold)
    # Suaviza para parecer resina molhada
    img = img.filter(ImageFilter.GaussianBlur(radius=14))
    # Realça um brilho central glossy
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse(
        (cx - radius * 1.1, cy * 0.55 - radius * 0.5,
         cx + radius * 1.1, cy * 0.55 + radius * 0.5),
        fill=(255, 255, 255, 60),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=40))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _svd_set_job_error(job_id: str, msg: str, status: int = 502) -> None:
    _VIDEO_JOBS[job_id] = {
        **_VIDEO_JOBS.get(job_id, {}),
        "status": "error",
        "error": msg[:240],
        "http_status": status,
        "finished_at_ts": time.time(),
    }


def _run_svd_job(job_id: str, color_a: str, color_b: str, duration: int, size: tuple[int, int]) -> None:
    """Roda Stable Video Diffusion 2.0 (fal.ai) e atualiza _VIDEO_JOBS.

    Pipeline: gera PNG-swirl (PIL) → upload fal storage → submete SVD →
    aguarda → baixa MP4 → guarda base64.
    """
    try:
        if not FAL_KEY:
            _svd_set_job_error(
                job_id,
                "FAL_KEY não configurada. Adicione FAL_KEY em backend/.env para gerar vídeos com Stable Video Diffusion 2.0.",
                status=500,
            )
            return
        png_bytes = _make_swirl_image_png(color_a, color_b, size)
        # Upload do frame-inicial para o storage do fal.ai
        image_url = fal_client.upload(png_bytes, "image/png")
        # Submete ao Stable Video Diffusion 2.0
        # motion_bucket_id 90-180 controla intensidade do movimento;
        # 127 é equilibrado para fluidos/líquidos.
        result = fal_client.subscribe(
            SVD_MODEL,
            arguments={
                "image_url": image_url,
                "motion_bucket_id": 140,
                "cond_aug": 0.02,
                "fps": 8,
                "seed": int(time.time()) & 0xFFFFFFFF,
            },
            with_logs=False,
        )
        video_url = (result or {}).get("video", {}).get("url") if isinstance(result, dict) else None
        if not video_url:
            raise RuntimeError("SVD 2.0 não retornou URL de vídeo")
        # Baixa o MP4 e converte para base64 (mantém contrato atual do frontend)
        with urllib.request.urlopen(video_url, timeout=120) as r:
            video_bytes = r.read()
        if not video_bytes:
            raise RuntimeError("SVD 2.0 retornou vídeo vazio")
        video_b64 = b64.b64encode(video_bytes).decode("ascii")
        _VIDEO_JOBS[job_id] = {
            **_VIDEO_JOBS.get(job_id, {}),
            "status": "completed",
            "video_base64": video_b64,
            "mime_type": "video/mp4",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "finished_at_ts": time.time(),
        }
        logger.info(f"SVD job {job_id} ok: bytes={len(video_bytes)}")
    except Exception as e:
        logger.exception(f"SVD job {job_id} error")
        _svd_set_job_error(job_id, f"Falha SVD 2.0: {e}", status=502)


@api_router.post("/ai/generate-video")
async def generate_video(req: VideoRequest, background_tasks: BackgroundTasks):
    """Dispara geração de vídeo via Stable Video Diffusion 2.0 (fal.ai) em background.
    Retorna {job_id} imediatamente.

    O cliente deve fazer polling em GET /api/ai/video-status/{job_id}
    a cada ~5s até receber status == 'completed' (com video_base64) ou 'error'.
    """
    if not FAL_KEY:
        raise HTTPException(
            status_code=503,
            detail="FAL_KEY não configurada. Adicione FAL_KEY em backend/.env (obtenha em https://fal.ai/dashboard/keys) para gerar vídeos com Stable Video Diffusion 2.0.",
        )

    duration = req.duration if req.duration in (4, 8, 12) else 4
    # Garante dimensões válidas para SVD (múltiplos de 64, até 1024x576)
    size = SVD_DEFAULT_SIZE

    job_id = str(uuid.uuid4())
    _VIDEO_JOBS[job_id] = {
        "status": "processing",
        "color_a": req.color_a,
        "color_b": req.color_b,
        "duration": duration,
        "size": f"{size[0]}x{size[1]}",
        "model": SVD_MODEL,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "started_at_ts": time.time(),
    }
    _cleanup_video_jobs()
    background_tasks.add_task(_run_svd_job, job_id, req.color_a, req.color_b, duration, size)
    logger.info(f"SVD job {job_id} queued: dur={duration} size={size}")
    return {"job_id": job_id, "status": "processing", "model": "stable-video-diffusion-2.0"}


@api_router.get("/ai/video-status/{job_id}")
async def video_status(job_id: str):
    """Retorna o status do job SVD 2.0 e, quando completo, o vídeo em base64."""
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
            "model": job.get("model"),
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
        "model": job.get("model"),
    }


# ===== Onboarding welcome video (SVD 2.0 swirl branded) =====
STATIC_DIR = ROOT_DIR / "static_assets"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
WELCOME_VIDEO_PATH = STATIC_DIR / "onboarding-welcome.mp4"
_WELCOME_JOB: dict = {"status": "idle"}  # status: idle | processing | completed | error


def _run_welcome_video_job() -> None:
    """Gera vídeo institucional via SVD 2.0 para o onboarding e salva em static_assets."""
    global _WELCOME_JOB
    try:
        if not FAL_KEY:
            _WELCOME_JOB = {
                "status": "error",
                "error": "FAL_KEY não configurada para gerar o vídeo institucional.",
            }
            return
        # Paleta-assinatura LindArt: champagne gold × emerald
        png_bytes = _make_swirl_image_png("#D4AF37", "#0F4C3A", SVD_DEFAULT_SIZE)
        image_url = fal_client.upload(png_bytes, "image/png")
        result = fal_client.subscribe(
            SVD_MODEL,
            arguments={
                "image_url": image_url,
                "motion_bucket_id": 150,
                "cond_aug": 0.02,
                "fps": 8,
                "seed": 7,
            },
            with_logs=False,
        )
        video_url = (result or {}).get("video", {}).get("url") if isinstance(result, dict) else None
        if not video_url:
            _WELCOME_JOB = {"status": "error", "error": "SVD 2.0 retornou sem URL de vídeo"}
            return
        with urllib.request.urlopen(video_url, timeout=120) as r:
            video_bytes = r.read()
        if not video_bytes:
            _WELCOME_JOB = {"status": "error", "error": "SVD 2.0 retornou vídeo vazio"}
            return
        with open(WELCOME_VIDEO_PATH, "wb") as f:
            f.write(video_bytes)
        _WELCOME_JOB = {
            "status": "completed",
            "size_bytes": len(video_bytes),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }
        logger.info(f"Welcome video (SVD 2.0) saved: {WELCOME_VIDEO_PATH} ({len(video_bytes)} bytes)")
    except Exception as e:
        logger.exception("welcome video generation failed")
        _WELCOME_JOB = {"status": "error", "error": str(e)[:200]}


@api_router.get("/onboarding/welcome-video")
async def onboarding_welcome_video_status():
    """Retorna o estado atual do vídeo de boas-vindas.

    - exists=True + url disponível → frontend renderiza <video src>
    - status=processing → frontend mostra placeholder + opcionalmente texto "gerando…"
    - exists=False → frontend mostra placeholder estático
    """
    exists = WELCOME_VIDEO_PATH.exists() and WELCOME_VIDEO_PATH.stat().st_size > 0
    return {
        "exists": exists,
        "url": "/api/static/onboarding-welcome.mp4" if exists else None,
        "status": _WELCOME_JOB.get("status", "idle"),
        "error": _WELCOME_JOB.get("error"),
    }


@api_router.post("/onboarding/generate-welcome-video")
async def onboarding_generate_welcome_video(background_tasks: BackgroundTasks):
    """Dispara geração do vídeo institucional via SVD 2.0 em background.

    Idempotente: se um job já está em processamento, retorna o estado atual.
    Se o vídeo já existe, retorna `already_exists=True`. Para regerar, deletar o arquivo
    em `/app/backend/static_assets/onboarding-welcome.mp4` antes.
    """
    global _WELCOME_JOB
    if not FAL_KEY:
        raise HTTPException(
            status_code=503,
            detail="FAL_KEY não configurada (https://fal.ai/dashboard/keys).",
        )

    if WELCOME_VIDEO_PATH.exists() and WELCOME_VIDEO_PATH.stat().st_size > 0:
        return {
            "already_exists": True,
            "url": "/api/static/onboarding-welcome.mp4",
        }
    if _WELCOME_JOB.get("status") == "processing":
        return {"status": "processing", "started_at": _WELCOME_JOB.get("started_at")}

    _WELCOME_JOB = {
        "status": "processing",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(_run_welcome_video_job)
    logger.info("Welcome video generation queued")
    return {"status": "processing", "started_at": _WELCOME_JOB["started_at"]}


@api_router.post("/ai/generate-caption")
async def generate_caption(req: CaptionRequest):
    """Gera legenda + hashtags prontas para redes sociais usando Claude.

    Retorna JSON estruturado:
    {
      "headline": "...",
      "caption": "...",
      "hashtags": ["#...", ...],
      "alt_text": "...",
      "cta": "..."
    }
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    if not req.colors:
        raise HTTPException(status_code=400, detail="Informe ao menos uma cor da paleta")

    platform = (req.platform or "instagram").lower()
    tone = (req.tone or "luxuoso").lower()
    piece = req.piece or "joia de resina"
    palette_name = req.palette_name or "paleta personalizada"
    style = req.style or "luxo"

    platform_specs = {
        "instagram": "Instagram (caption envolvente, 2-4 parágrafos curtos, emojis sutis e elegantes, CTA suave)",
        "tiktok": "TikTok (hook forte na primeira linha, copy curta e direta, energia, hashtags virais)",
        "etsy": "Etsy (descrição de produto vendedora, foco em material/dimensão sugerida/ocasião, sem emojis)",
    }
    platform_brief = platform_specs.get(platform, platform_specs["instagram"])

    system_msg = (
        "Você é uma copywriter especialista em moda de luxo e joalheria artesanal, "
        "com domínio em redes sociais. Sua função é criar copy que vende sem soar comercial: "
        "poético, sensorial, sofisticado. Tom: " + tone + ". "
        "Plataforma: " + platform_brief + ". "
        "Idioma de saída: " + (req.language or "pt-BR") + ". "
        "Retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem ```), no formato:\n"
        "{\n"
        '  "headline": "Frase de impacto curta (até 8 palavras)",\n'
        '  "caption": "Copy principal pronta para postar",\n'
        '  "hashtags": ["#tag1", "#tag2", ...],\n'
        '  "alt_text": "Descrição acessível da imagem (até 140 caracteres)",\n'
        '  "cta": "Call to action curto"\n'
        "}\n"
        "Regras:\n"
        "- 10 a 18 hashtags relevantes para resina, joalheria artesanal, decor e o estilo da peça.\n"
        "- Sem hashtags genéricas demais (ex: #love, #instagood).\n"
        "- Caption entre 250 e 600 caracteres.\n"
        "- Não invente preços nem prazos."
    )

    color_list = ", ".join([c for c in req.colors if isinstance(c, str)])
    user_text = (
        f"Crie copy para uma peça de {piece} feita em resina epóxi, "
        f"usando a paleta \"{palette_name}\" (estilo {style}). "
        f"Cores em HEX: {color_list}. "
        "Descreva a sensação que essas cores transmitem e venda a peça."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"caption-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        response = await chat.send_message(UserMessage(text=user_text))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Caption AI error: {e!r}")
        raise _map_llm_exception(e)

    raw = (response or "").strip()
    data = _parse_llm_json(raw)
    if not data:
        logger.error(f"Caption AI: parser falhou. Raw (200ch): {raw[:200]!r}")
        # Fallback: extrai algo razoável do texto cru para não travar a UI
        # Headline = primeira linha não vazia
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        headline = (lines[0] if lines else "Inspiração em resina").strip("\"'#* ")[:80]
        # Caption = texto inteiro (sem chaves JSON tentadas)
        caption_text = re.sub(r"[{}]", " ", raw).strip()
        if len(caption_text) > 600:
            caption_text = caption_text[:600].rsplit(" ", 1)[0] + "…"
        # Hashtags básicas pela paleta/estilo
        base_tags = ["#resinaepoxi", "#joalheriaartesanal", "#artesanalbrasil",
                     "#resinart", "#luxohandmade", "#designautoral"]
        if style:
            base_tags.append("#" + re.sub(r"[^\w]", "", style, flags=re.UNICODE).lower())
        data = {
            "headline": headline or "Inspiração em resina",
            "caption": caption_text or f"Uma peça em {piece} com paleta {palette_name}.",
            "hashtags": base_tags,
            "alt_text": f"Peça de {piece} em resina com paleta {palette_name}.",
            "cta": "Garanta a sua peça.",
        }

    # Sanitiza hashtags
    raw_tags = data.get("hashtags") or []
    if isinstance(raw_tags, str):
        raw_tags = [t for t in re.split(r"[\s,]+", raw_tags) if t]
    hashtags = []
    seen = set()
    for t in raw_tags:
        if not isinstance(t, str):
            continue
        tag = t.strip()
        if not tag:
            continue
        if not tag.startswith("#"):
            tag = "#" + re.sub(r"[^\w]", "", tag, flags=re.UNICODE)
        if len(tag) <= 1:
            continue
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        hashtags.append(tag)

    return {
        "headline": str(data.get("headline", "")).strip(),
        "caption": str(data.get("caption", "")).strip(),
        "hashtags": hashtags[:20],
        "alt_text": str(data.get("alt_text", "")).strip()[:200],
        "cta": str(data.get("cta", "")).strip(),
        "platform": platform,
        "tone": tone,
    }


# ===== Luxury Score helpers =====
def _hex_to_rgb(h: str) -> Optional[tuple]:
    if not isinstance(h, str):
        return None
    s = h.strip().lstrip("#")
    if len(s) != 6:
        return None
    try:
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))
    except ValueError:
        return None


def _rgb_to_hsl(r: int, g: int, b: int) -> tuple:
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(rf, gf, bf), min(rf, gf, bf)
    l = (mx + mn) / 2.0
    if mx == mn:
        return (0.0, 0.0, l)
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == rf:
        h = ((gf - bf) / d) + (6 if gf < bf else 0)
    elif mx == gf:
        h = (bf - rf) / d + 2
    else:
        h = (rf - gf) / d + 4
    return (h * 60.0, s, l)


def _compute_heuristic_luxury(colors: List[str]) -> dict:
    """Heurística determinística (0-100) baseada em harmonia / contraste / sofisticação."""
    rgbs = [c for c in (_hex_to_rgb(h) for h in colors) if c]
    if not rgbs:
        return {
            "score": 50,
            "contrast": 50,
            "harmony": 50,
            "depth": 50,
            "sophistication": 50,
        }

    hsls = [_rgb_to_hsl(*c) for c in rgbs]
    ls = [x[2] for x in hsls]
    ss = [x[1] for x in hsls]

    # Contraste: amplitude de luminâncias (alto contraste = mais drama)
    contrast = (max(ls) - min(ls)) * 100  # 0..100

    # Profundidade: presença de pelo menos uma cor escura (L < 0.18)
    has_dark = any(l < 0.20 for l in ls)
    has_light = any(l > 0.80 for l in ls)
    depth = 60 + (20 if has_dark else 0) + (10 if has_light else 0)
    depth = min(100, depth)

    # Sofisticação: penaliza saturação extrema média (cores fluo = menos luxo)
    avg_sat = sum(ss) / len(ss)
    sophistication = 100 - max(0, (avg_sat - 0.55)) * 120
    sophistication = max(20, min(100, sophistication))

    # Harmonia: distância angular mediana dos matizes (queremos espaçamento, não caos)
    hues = sorted([x[0] for x in hsls])
    diffs = [hues[i + 1] - hues[i] for i in range(len(hues) - 1)] if len(hues) > 1 else [0]
    # Idealmente diferenças não muito pequenas (<15) nem muito grandes (>180)
    def harmony_for(d):
        if d <= 0:
            return 60
        if d < 15:
            return 70
        if d < 60:
            return 90
        if d < 120:
            return 95
        if d < 180:
            return 85
        return 70
    harmony = sum(harmony_for(d) for d in diffs) / max(1, len(diffs))

    score = round(
        0.30 * contrast
        + 0.25 * harmony
        + 0.20 * depth
        + 0.25 * sophistication
    )
    score = max(0, min(100, score))
    return {
        "score": int(score),
        "contrast": round(contrast),
        "harmony": round(harmony),
        "depth": round(depth),
        "sophistication": round(sophistication),
    }


@api_router.post("/ai/luxury-score")
async def luxury_score(req: LuxuryScoreRequest):
    """Calcula o Luxury Score (0-100) de uma paleta.

    Combina heurística cromática determinística + parecer poético da IA (Claude).
    Retorna sempre os números heurísticos; o `verdict` da IA é melhor-esforço
    (se a IA falhar, retornamos um fallback textual baseado na heurística).
    """
    if not req.colors:
        raise HTTPException(status_code=400, detail="Informe ao menos uma cor da paleta")

    metrics = _compute_heuristic_luxury(req.colors)
    score = metrics["score"]

    if score >= 88:
        tier = "Couture"
    elif score >= 75:
        tier = "Atelier"
    elif score >= 60:
        tier = "Premium"
    elif score >= 45:
        tier = "Casual Chic"
    else:
        tier = "Daily"

    verdict = ""
    suggestions: List[str] = []

    if EMERGENT_LLM_KEY:
        try:
            color_list = ", ".join([c for c in req.colors if isinstance(c, str)])
            system_msg = (
                "Você é uma diretora criativa de joalheria de luxo. "
                "Avalie a paleta com olhar crítico e refinado. "
                "Retorne EXCLUSIVAMENTE JSON válido no formato:\n"
                "{\n"
                '  "verdict": "1-2 frases curtas em português elegante sobre o feeling da paleta",\n'
                '  "suggestions": ["3 sugestões curtas e acionáveis para elevar o luxo da paleta"]\n'
                "}\n"
                "Sem markdown. Tom: refinado, conciso, evite clichês."
            )
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"luxury-{uuid.uuid4()}",
                system_message=system_msg,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            user_text = (
                f"Paleta \"{req.palette_name or 'sem nome'}\" "
                f"(estilo {req.style or 'não especificado'}). "
                f"Cores: {color_list}. "
                f"Score heurístico: {score}/100 (tier {tier}). "
                f"Descrição: {req.description or '—'}."
            )
            response = await chat.send_message(UserMessage(text=user_text))
            raw = (response or "").strip()
            data = _parse_llm_json(raw)
            if data:
                verdict = str(data.get("verdict", "")).strip()
                sg = data.get("suggestions") or []
                if isinstance(sg, list):
                    suggestions = [str(s).strip() for s in sg if str(s).strip()][:5]
        except Exception as e:
            logger.warning(f"Luxury verdict fallback: {e!r}")

    if not verdict:
        if score >= 80:
            verdict = "Paleta com excelente equilíbrio entre contraste e sofisticação — pronta para campanhas premium."
        elif score >= 60:
            verdict = "Boa base de luxo. Pequenos ajustes em profundidade ou contraste podem elevar a peça."
        else:
            verdict = "Paleta interessante, mas distante do território luxuoso — considere intensificar contraste ou trocar uma cor saturada por um neutro profundo."
    if not suggestions:
        suggestions = [
            "Acrescente um acento metálico (dourado, cobre ou champagne)",
            "Inclua uma cor escura profunda para criar drama",
            "Reduza saturação de cores muito vibrantes",
        ]

    return {
        "score": score,
        "tier": tier,
        "metrics": metrics,
        "verdict": verdict,
        "suggestions": suggestions,
    }


# ===== Visual DNA =====
def _hex_distance(a: tuple, b: tuple) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def _cluster_dominant_colors(hexes: List[str], k: int = 6) -> List[dict]:
    """K-means-lite (greedy farthest-point) para extrair cores dominantes
    sem dependência extra. Retorna lista [{hex, weight(0..1)}]."""
    rgbs = [c for c in (_hex_to_rgb(h) for h in hexes) if c]
    if not rgbs:
        return []
    # seed: a cor mais "no meio"
    centers = [rgbs[0]]
    for _ in range(min(k - 1, len(rgbs) - 1)):
        # adiciona a mais distante das atuais
        best, best_d = None, -1
        for c in rgbs:
            d = min(_hex_distance(c, ctr) for ctr in centers)
            if d > best_d:
                best_d, best = d, c
        if best is not None and best not in centers:
            centers.append(best)
        else:
            break
    # atribui pesos por contagem de "mais próximo"
    counts = [0] * len(centers)
    for c in rgbs:
        idx = min(range(len(centers)), key=lambda i: _hex_distance(c, centers[i]))
        counts[idx] += 1
    total = sum(counts) or 1
    result = []
    for ctr, ct in sorted(zip(centers, counts), key=lambda x: -x[1]):
        hexc = "#{:02x}{:02x}{:02x}".format(*ctr).upper()
        result.append({"hex": hexc, "weight": round(ct / total, 3)})
    return result


def _compute_dna_metrics(palettes: List[dict]) -> dict:
    all_colors: List[str] = []
    styles: dict = {}
    fav_count = 0
    for p in palettes:
        cols = p.get("colors") or []
        for c in cols:
            if isinstance(c, str):
                all_colors.append(c)
            elif isinstance(c, dict) and isinstance(c.get("hex"), str):
                all_colors.append(c["hex"])
        st = p.get("style")
        if st:
            styles[st] = styles.get(st, 0) + 1
        if p.get("favorite"):
            fav_count += 1

    if not all_colors:
        return {
            "dominant": [],
            "stats": {"palettes": len(palettes), "colors": 0, "favorites": fav_count},
            "style_breakdown": [],
            "avg": {"contrast": 0, "harmony": 0, "depth": 0, "sophistication": 0, "luxury": 0},
        }

    # Médias das métricas heurísticas por paleta
    per = []
    for p in palettes:
        cols = []
        for c in p.get("colors") or []:
            if isinstance(c, str):
                cols.append(c)
            elif isinstance(c, dict) and isinstance(c.get("hex"), str):
                cols.append(c["hex"])
        if cols:
            per.append(_compute_heuristic_luxury(cols))
    n = max(1, len(per))
    avg = {
        "contrast": round(sum(x["contrast"] for x in per) / n),
        "harmony": round(sum(x["harmony"] for x in per) / n),
        "depth": round(sum(x["depth"] for x in per) / n),
        "sophistication": round(sum(x["sophistication"] for x in per) / n),
        "luxury": round(sum(x["score"] for x in per) / n),
    }

    dominant = _cluster_dominant_colors(all_colors, k=6)
    style_breakdown = [
        {"style": k, "count": v} for k, v in sorted(styles.items(), key=lambda x: -x[1])
    ]
    return {
        "dominant": dominant,
        "stats": {
            "palettes": len(palettes),
            "colors": len(all_colors),
            "favorites": fav_count,
        },
        "style_breakdown": style_breakdown,
        "avg": avg,
    }


@api_router.post("/ai/visual-dna")
async def visual_dna(req: VisualDNARequest):
    """Analisa as paletas do usuário e retorna a 'linguagem visual' dele.

    Combina:
    - Métricas determinísticas (cores dominantes, médias de luxo, estilos)
    - Parecer poético da IA (assinatura, mood, recomendações)
    """
    palettes = req.palettes or []
    if not palettes:
        raise HTTPException(
            status_code=400,
            detail="Envie ao menos 1 paleta para analisar sua linguagem visual",
        )

    metrics = _compute_dna_metrics(palettes)

    signature = ""
    mood: List[str] = []
    recommendations: List[str] = []
    next_palette: List[str] = []

    if EMERGENT_LLM_KEY and metrics["dominant"]:
        try:
            top_hex = ", ".join(d["hex"] for d in metrics["dominant"])
            styles_str = ", ".join(
                f"{s['style']} ({s['count']})" for s in metrics["style_breakdown"][:5]
            ) or "—"
            system_msg = (
                "Você é uma diretora criativa que decifra a linguagem visual "
                "de artistas de joalheria em resina. Retorne EXCLUSIVAMENTE JSON válido:\n"
                "{\n"
                '  "signature": "1-2 frases descrevendo a assinatura estética do artista (PT-BR refinado)",\n'
                '  "mood": ["3-5 adjetivos curtos que definem o universo dele"],\n'
                '  "recommendations": ["3 sugestões acionáveis para evoluir a linguagem"],\n'
                '  "next_palette": ["5 hex codes #RRGGBB de uma próxima paleta coerente com o DNA"]\n'
                "}\n"
                "Sem markdown, sem cercas de código."
            )
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"dna-{uuid.uuid4()}",
                system_message=system_msg,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            user_text = (
                f"Artista tem {metrics['stats']['palettes']} paletas "
                f"({metrics['stats']['favorites']} favoritas). "
                f"Cores dominantes: {top_hex}. "
                f"Estilos preferidos: {styles_str}. "
                f"Médias — luxo {metrics['avg']['luxury']}/100, "
                f"contraste {metrics['avg']['contrast']}, "
                f"harmonia {metrics['avg']['harmony']}, "
                f"profundidade {metrics['avg']['depth']}, "
                f"sofisticação {metrics['avg']['sophistication']}."
            )
            response = await chat.send_message(UserMessage(text=user_text))
            raw = (response or "").strip()
            data = _parse_llm_json(raw)
            if data:
                signature = str(data.get("signature", "")).strip()
                m = data.get("mood") or []
                if isinstance(m, list):
                    mood = [str(x).strip() for x in m if str(x).strip()][:6]
                rc = data.get("recommendations") or []
                if isinstance(rc, list):
                    recommendations = [str(x).strip() for x in rc if str(x).strip()][:5]
                np_ = data.get("next_palette") or []
                if isinstance(np_, list):
                    next_palette = [
                        s.strip()
                        for s in np_
                        if isinstance(s, str)
                        and re.match(r"^#?[0-9A-Fa-f]{6}$", s.strip())
                    ][:6]
                    next_palette = [
                        ("#" + c.lstrip("#")).upper() for c in next_palette
                    ]
        except Exception as e:
            logger.warning(f"Visual DNA fallback: {e!r}")

    if not signature:
        avg_lux = metrics["avg"]["luxury"]
        if avg_lux >= 75:
            signature = (
                "Sua linguagem visual respira luxo silencioso — paletas "
                "profundas, contraste intencional e refinamento consistente."
            )
        elif avg_lux >= 55:
            signature = (
                "Você transita entre o sofisticado e o autoral, com uma "
                "paleta pessoal em construção e bom senso cromático."
            )
        else:
            signature = (
                "Sua linguagem é vibrante e experimental — há espaço para "
                "amadurecer o contraste e ganhar mais profundidade."
            )
    if not mood:
        mood = ["refinado", "autoral", "intencional"]
    if not recommendations:
        recommendations = [
            "Crie 3 paletas seguidas com a mesma cor escura âncora",
            "Experimente acabamentos metálicos para reforçar a assinatura",
            "Documente as paletas favoritas em uma série temática",
        ]
    if not next_palette:
        next_palette = [d["hex"] for d in metrics["dominant"][:5]]

    return {
        "signature": signature,
        "mood": mood,
        "recommendations": recommendations,
        "next_palette": next_palette,
        "dominant": metrics["dominant"],
        "stats": metrics["stats"],
        "style_breakdown": metrics["style_breakdown"],
        "avg": metrics["avg"],
    }


class DNAShareIn(BaseModel):
    payload: dict
    handle: Optional[str] = None


# ============================================================
# 🧠 Mentora IA do Ateliê — chat especializado em resina epóxi.
# ============================================================
class MentoraMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class MentoraRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    history: Optional[List[MentoraMessage]] = None
    image_base64: Optional[str] = None  # opcional: foto da peça para diagnóstico


_MENTORA_SYSTEM = (
    "Você é a Mentora IA do Ateliê LindArt — uma especialista sênior em resina "
    "epóxi de alta joalheria e decoração de luxo. Você fala em PT-BR, com tom "
    "acolhedor, técnico-poético e direto ao ponto. Sua expertise inclui: "
    "proporção resina/catalisador, tempo de cura, eliminação de bolhas, "
    "pigmentação (alcoólica, em pasta, mica, pearl), efeitos (mármore, geodo, "
    "ocean, galáxia, smokey), acabamento (lixa, polimento, alto-brilho), "
    "molhos de silicone, ambiente (umidade, temperatura), fornecedores BR, "
    "tendências e correção de erros comuns (peça opaca, amarelada, mole, com "
    "crateras, fish-eyes, vazios, descolamento). "
    "Diretrizes de resposta: "
    "1) Seja concisa — 3-6 parágrafos curtos, ou bullet list quando ajudar. "
    "2) Quando o usuário descrever um problema, diagnostique CAUSAS PROVÁVEIS "
    "em ordem de probabilidade + CORREÇÕES práticas. "
    "3) Use unidades métricas (g, ml, °C, %). "
    "4) Cite proporções e tempos específicos quando aplicável. "
    "5) Termine com uma pergunta curta de follow-up quando fizer sentido. "
    "6) Nunca invente marcas; se citar, use termos genéricos (ex: 'resina "
    "epóxi cristal AB 1:1'). "
    "7) Se a pergunta fugir do nicho (resina, cores, mockup, atelier), "
    "responda gentilmente que sua especialidade é resina e redirecione."
)


@api_router.post("/ai/mentora")
async def mentora_chat(req: MentoraRequest):
    """Chat com a Mentora IA do Ateliê (Claude Sonnet 4.5).

    Suporta sessão persistente via `session_id` (mesma sessão = mesmo contexto
    no lado do LLM). Cliente pode também enviar `history` recente para reforçar
    contexto após reload. Aceita imagem opcional para diagnóstico visual.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Mensagem vazia")
    if len(msg) > 4000:
        raise HTTPException(status_code=413, detail="Mensagem muito longa")

    session_id = (req.session_id or f"mentora-{uuid.uuid4().hex[:12]}").strip()[:80]

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=_MENTORA_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Reforça contexto recente (últimas 6 trocas) — emergentintegrations já
    # mantém histórico server-side via session_id, mas o cliente pode enviar
    # `history` para retomar sessões antigas.
    context_prefix = ""
    if req.history:
        recent = req.history[-6:]
        lines = []
        for m in recent:
            r = "Usuário" if (m.role or "").lower() == "user" else "Mentora"
            lines.append(f"{r}: {m.content[:600]}")
        if lines:
            context_prefix = "Contexto recente da conversa:\n" + "\n".join(lines) + "\n\nPergunta atual:\n"

    file_contents = None
    if req.image_base64:
        raw_b64 = req.image_base64
        if "," in raw_b64 and raw_b64.lstrip().startswith("data:"):
            raw_b64 = raw_b64.split(",", 1)[1]
        try:
            file_contents = [ImageContent(image_base64=raw_b64)]
        except Exception:
            file_contents = None

    user_msg = UserMessage(text=context_prefix + msg, file_contents=file_contents)
    try:
        response = await chat.send_message(user_msg)
    except Exception as e:
        logger.error(f"Mentora error: {e!r}")
        raise _map_llm_exception(e)

    reply = (response or "").strip()
    logger.info(f"Mentora ok: session={session_id} q={len(msg)} a={len(reply)} img={bool(file_contents)}")
    return {"session_id": session_id, "reply": reply}


# ============================================================
# 📈 Tendências da Semana — paletas em alta no nicho de resina.
# ============================================================
class TrendsRequest(BaseModel):
    refresh: bool = False  # força regerar mesmo se cache válido
    focus: Optional[str] = None  # ex: "joalheria", "decoração", "verão"


_TRENDS_CACHE: dict = {"key": None, "data": None, "ts": 0.0}
_TRENDS_TTL_SECONDS = 60 * 60 * 24  # 24h


@api_router.post("/ai/trends")
async def ai_trends(req: TrendsRequest):
    """Retorna 5 paletas em tendência para resina epóxi (curadoria IA).

    Faz cache em memória por 24h para economizar chamadas — passe `refresh=true`
    para forçar regeneração. Resultado: lista pronta para consumo visual.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    cache_key = (req.focus or "geral").strip().lower()
    now = time.time()
    if (
        not req.refresh
        and _TRENDS_CACHE.get("key") == cache_key
        and _TRENDS_CACHE.get("data")
        and now - _TRENDS_CACHE.get("ts", 0) < _TRENDS_TTL_SECONDS
    ):
        return {"cached": True, **_TRENDS_CACHE["data"]}

    system_msg = (
        "Você é a curadora de tendências do LindArt — especialista em estética "
        "de resina epóxi de luxo, joalheria contemporânea e decoração premium. "
        "Sua função: identificar 5 tendências cromáticas em ALTA agora no "
        "nicho de resina (Pinterest BR/US, Instagram, TikTok). "
        "Retorne EXCLUSIVAMENTE JSON válido (sem markdown, sem ```), formato:\n"
        "{\n"
        '  "week_theme": "Tema unificador desta semana (frase curta poética)",\n'
        '  "trends": [\n'
        '    {\n'
        '      "name": "Nome da tendência (2-3 palavras)",\n'
        '      "tagline": "Frase de 8-12 palavras descrevendo o feeling",\n'
        '      "colors": ["#XXXXXX","#XXXXXX","#XXXXXX","#XXXXXX"],\n'
        '      "style": "geodo | marmore | oceano | galaxia | floral | metalico | pastel | boho | luxo | minimalista",\n'
        '      "tags": ["tag1","tag2","tag3"],\n'
        '      "viral_score": 78\n'
        '    }\n'
        '  ]\n'
        "}\n"
        "Regras: exatamente 5 tendências, 4 cores HEX cada, viral_score 0-100, "
        "diversidade de paletas (não todas escuras nem todas claras). "
        "Pense em peças reais: bandejas, joias, relógios, arte de parede."
    )
    user_text = (
        f"Gere as 5 tendências da semana para resina epóxi. Foco: {cache_key}. "
        f"Considere data atual {datetime.now(timezone.utc).strftime('%B %Y')}."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"trends-{uuid.uuid4().hex[:10]}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as e:
        logger.error(f"Trends error: {e!r}")
        raise _map_llm_exception(e)

    data = _parse_llm_json(raw) or {}
    trends = data.get("trends") or []
    if not isinstance(trends, list) or len(trends) < 3:
        # Fallback minimalista
        trends = [
            {"name": "Oceano Cristal", "tagline": "Translúcidos azuis com veios brancos e dourado champagne",
             "colors": ["#0E5F8A", "#9BD9E5", "#F4F1E8", "#D8B260"], "style": "oceano",
             "tags": ["translucido", "azul", "champagne"], "viral_score": 82},
            {"name": "Mármore Rosé", "tagline": "Brancos leitosos com veios rosé e ouro fosco",
             "colors": ["#F7F2EE", "#E8C4C0", "#C9A27E", "#A07150"], "style": "marmore",
             "tags": ["nude", "rosegold", "feminino"], "viral_score": 76},
            {"name": "Galáxia Smokey", "tagline": "Pretos profundos com brilho metálico e pó de estrela",
             "colors": ["#0B0B12", "#2A2540", "#7B6FB5", "#E2D5A3"], "style": "galaxia",
             "tags": ["dark", "metalico", "luxo"], "viral_score": 71},
            {"name": "Âmbar Translúcido", "tagline": "Mel dourado com folhas botânicas e fundo cristal",
             "colors": ["#F1DDA1", "#C68943", "#6B3E13", "#FFF7E2"], "style": "luxo",
             "tags": ["amber", "botanico", "warm"], "viral_score": 68},
            {"name": "Pastel Geodo", "tagline": "Rosas leitosos e mentas com veios brancos perolados",
             "colors": ["#F6DDE3", "#D4F0E0", "#FFFFFF", "#E5C8A0"], "style": "geodo",
             "tags": ["pastel", "soft", "geodo"], "viral_score": 64},
        ]
    week_theme = data.get("week_theme") or "Translucidez & Metálicos: a semana da resina escultural"

    result = {
        "week_theme": week_theme,
        "trends": trends[:5],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "focus": cache_key,
    }
    _TRENDS_CACHE["key"] = cache_key
    _TRENDS_CACHE["data"] = result
    _TRENDS_CACHE["ts"] = now
    logger.info(f"Trends ok: focus={cache_key} n={len(result['trends'])}")
    return {"cached": False, **result}


# ============================================================
# 🎨 Gerador de Coleções — múltiplas peças coerentes (Claude).
# ============================================================
class CollectionRequest(BaseModel):
    theme: str  # ex: "coleção oceano premium"
    pieces: Optional[List[str]] = None  # ex: ["bandeja", "relógio", "porta-copos"]


@api_router.post("/ai/collection")
async def ai_collection(req: CollectionRequest):
    """Cria uma coleção coerente: paleta + descrição de cada peça.

    Frontend pode então usar `/api/ai/generate-image` para gerar mockup
    visual de cada peça com base nas `mockup_prompts` retornadas.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    theme = (req.theme or "").strip()
    if not theme:
        raise HTTPException(status_code=400, detail="Informe o tema da coleção")
    if len(theme) > 200:
        raise HTTPException(status_code=413, detail="Tema muito longo")

    default_pieces = ["bandeja", "relógio de parede", "porta-copos", "arte de parede"]
    pieces = req.pieces or default_pieces
    pieces = [p.strip() for p in pieces if (p or "").strip()][:6]
    if not pieces:
        pieces = default_pieces

    system_msg = (
        "Você é diretor criativo de uma linha de resina epóxi premium. "
        "Dado um tema, crie uma COLEÇÃO coerente com paleta única e múltiplas "
        "peças que conversem visualmente entre si. Retorne EXCLUSIVAMENTE JSON "
        "válido (sem markdown), formato:\n"
        "{\n"
        '  "collection_name": "Nome poético da coleção (3-5 palavras)",\n'
        '  "concept": "Conceito da coleção em 2 frases",\n'
        '  "palette": {\n'
        '    "name": "Nome da paleta",\n'
        '    "colors": [\n'
        '      {"hex":"#XXXXXX","name":"...","role":"principal"},\n'
        '      {"hex":"#XXXXXX","name":"...","role":"acento"},\n'
        '      {"hex":"#XXXXXX","name":"...","role":"detalhe"},\n'
        '      {"hex":"#XXXXXX","name":"...","role":"veios"}\n'
        '    ]\n'
        '  },\n'
        '  "pieces": [\n'
        '    {\n'
        '      "type": "tipo da peça (ex: bandeja)",\n'
        '      "title": "Nome da peça nessa coleção",\n'
        '      "description": "Descrição evocativa em 1-2 frases",\n'
        '      "finish": "acabamento sugerido (alto-brilho, fosco, cetim)",\n'
        '      "highlights": ["destaque1","destaque2"],\n'
        '      "mockup_prompt": "Prompt EM INGLÊS, fotorrealista, para gerador de imagem (Nano Banana), descrevendo a peça com as cores HEX da paleta, ambiente de luxo, luz natural suave, ângulo 3/4."\n'
        '    }\n'
        '  ]\n'
        "}\n"
        "Regras: paleta exatamente 4 HEX, peças idênticas à lista do usuário "
        "(mesma ordem), mockup_prompt sempre em INGLÊS começando por "
        "'photorealistic luxury epoxy resin' e citando os HEX entre parênteses."
    )
    user_text = (
        f"Tema: {theme}\n"
        f"Peças a incluir (mesma ordem): {', '.join(pieces)}"
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"collection-{uuid.uuid4().hex[:10]}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as e:
        logger.error(f"Collection error: {e!r}")
        raise _map_llm_exception(e)

    data = _parse_llm_json(raw) or {}
    if not data.get("pieces") or not data.get("palette"):
        raise HTTPException(status_code=502, detail="IA retornou estrutura inválida. Tente novamente.")
    data.setdefault("collection_name", theme.title())
    data.setdefault("concept", "")
    logger.info(f"Collection ok: theme={theme[:40]} pieces={len(data.get('pieces', []))}")
    return data


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


def _html_escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _absolute_origin(request: Request) -> str:
    """Resolve o origin público (https://host) preservando proxy headers.
    Crawlers do WhatsApp/IG/FB exigem URLs absolutas em og:image e og:url.
    """
    fwd_proto = request.headers.get("x-forwarded-proto")
    fwd_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    scheme = (fwd_proto or request.url.scheme or "https").split(",")[0].strip()
    host = (fwd_host or request.url.netloc).split(",")[0].strip()
    return f"{scheme}://{host}"


def _render_dna_og_html(share_id: str, payload: dict, handle: Optional[str], origin: str = "") -> str:
    """Renderiza HTML com OG tags dinâmicas para preview em IG/WhatsApp/X/FB.
    Humanos são redirecionados para /dna/{share_id} via meta refresh + JS."""
    signature = (payload.get("signature") or "DNA Visual").strip()[:80] or "DNA Visual"
    mood_list = payload.get("mood") or []
    mood_txt = " · ".join([m for m in mood_list if isinstance(m, str)][:4])
    colors = [c for c in (payload.get("dominant_colors") or []) if isinstance(c, str) and c.startswith("#")][:6]
    colors_swatch = "".join(
        f'<span style="display:inline-block;width:18px;height:18px;background:{_html_escape(c)};border:1px solid #0002;border-radius:3px;margin-right:4px"></span>'
        for c in colors
    )
    author_txt = f" — @{_html_escape(handle)}" if handle else ""
    title = f"{_html_escape(signature)} · DNA Visual{author_txt} — LindArt"
    desc_parts = []
    if mood_txt:
        desc_parts.append(_html_escape(mood_txt))
    if colors:
        desc_parts.append("Paleta: " + " ".join(_html_escape(c) for c in colors))
    desc_parts.append("Descubra seu DNA Visual em resina no LindArt.")
    description = " · ".join(desc_parts)[:280]

    # URLs absolutas (obrigatório para crawlers WhatsApp/IG/FB)
    redirect_path = f"/dna/{_html_escape(share_id)}"
    redirect_abs = f"{origin}{redirect_path}" if origin else redirect_path
    og_image_abs = (
        f"{origin}/api/og/dna/{_html_escape(share_id)}/image.svg"
        if origin
        else f"/api/og/dna/{_html_escape(share_id)}/image.svg"
    )

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">

<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{og_image_abs}">
<meta property="og:image:secure_url" content="{og_image_abs}">
<meta property="og:image:type" content="image/svg+xml">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{_html_escape(signature)} — DNA Visual em resina">
<meta property="og:url" content="{redirect_abs}">
<meta property="og:site_name" content="LindArt">
<meta property="og:locale" content="pt_BR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{og_image_abs}">
<meta name="twitter:image:alt" content="{_html_escape(signature)} — DNA Visual em resina">

<meta http-equiv="refresh" content="0; url={redirect_path}">
<link rel="canonical" href="{redirect_abs or redirect_path}">
<style>
body{{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f0f0f;color:#f4f1ea;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}}
.box{{max-width:520px}}
h1{{font-weight:300;letter-spacing:.04em;margin:0 0 12px;font-size:22px}}
p{{opacity:.8;line-height:1.5;margin:0 0 18px}}
a{{color:#f4f1ea;border:1px solid #f4f1ea4d;padding:10px 16px;text-decoration:none;display:inline-block;border-radius:2px}}
.sw{{margin:16px 0}}
</style>
</head>
<body>
<div class="box">
<h1>{_html_escape(signature)} · DNA Visual</h1>
<div class="sw">{colors_swatch}</div>
<p>{description}</p>
<a href="{redirect_path}">Abrir no LindArt →</a>
</div>
<script>setTimeout(function(){{window.location.replace({json.dumps(redirect_path)});}},80);</script>
</body>
</html>"""


@app.get("/api/og/dna/{share_id}", response_class=HTMLResponse)
async def og_dna_page(share_id: str, request: Request):
    """Página HTML com Open Graph tags dinâmicas para compartilhamento social.
    Crawlers (WhatsApp, Instagram, X, Facebook) pegam os metatags;
    humanos são redirecionados para /dna/{share_id}."""
    origin = _absolute_origin(request)
    doc = await db.dna_shares.find_one({"id": share_id}, {"_id": 0})
    if not doc:
        # 404 ainda renderiza HTML básico para crawlers não quebrarem
        html = (
            '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            '<title>DNA não encontrado · LindArt</title>'
            '<meta property="og:title" content="DNA Visual não encontrado">'
            '<meta property="og:description" content="Este DNA Visual expirou ou foi removido.">'
            f'<meta property="og:url" content="{origin}/">'
            '<meta http-equiv="refresh" content="0; url=/">'
            "</head><body>DNA não encontrado.</body></html>"
        )
        return HTMLResponse(content=html, status_code=404)
    payload = doc.get("payload") or {}
    handle = doc.get("handle")
    html = _render_dna_og_html(share_id, payload, handle, origin=origin)
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=600, s-maxage=600"},
    )


@app.get("/api/og/dna/{share_id}/image.svg")
async def og_dna_image_svg(share_id: str):
    """Imagem OG (SVG) gerada a partir da paleta do DNA. 1200x630 para social."""
    doc = await db.dna_shares.find_one({"id": share_id}, {"_id": 0})
    payload = (doc or {}).get("payload") or {}
    signature = (payload.get("signature") or "DNA Visual").strip()[:60] or "DNA Visual"
    mood_list = payload.get("mood") or []
    mood_txt = " · ".join([m for m in mood_list if isinstance(m, str)][:3])[:90]
    colors = [c for c in (payload.get("dominant_colors") or []) if isinstance(c, str) and c.startswith("#")][:5]
    if not colors:
        colors = ["#1a1a1a", "#3b3b3b", "#9b8b6e", "#f4f1ea", "#c4b9a6"]
    handle = (doc or {}).get("handle")
    author = f"@{handle}" if handle else "LindArt"

    # Gradiente vertical com as 5 primeiras cores em paradas igualmente espaçadas
    stops = "".join(
        f'<stop offset="{int(i / max(1, len(colors) - 1) * 100)}%" stop-color="{_html_escape(c)}"/>'
        for i, c in enumerate(colors)
    )
    swatch_w = 1080 // max(1, len(colors))
    swatches = "".join(
        f'<rect x="{60 + i * swatch_w}" y="470" width="{swatch_w - 12}" height="80" fill="{_html_escape(c)}" rx="4"/>'
        for i, c in enumerate(colors)
    )
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient>
    <filter id="grain"><feTurbulence baseFrequency="0.9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="#000" opacity="0.45"/>
  <rect width="1200" height="630" filter="url(#grain)"/>
  <g font-family="Georgia, 'Times New Roman', serif" fill="#f4f1ea">
    <text x="60" y="120" font-size="28" letter-spacing="6" opacity="0.65">LINDART · DNA VISUAL</text>
    <text x="60" y="260" font-size="76" font-weight="300" letter-spacing="2">{_html_escape(signature)}</text>
    <text x="60" y="320" font-size="30" opacity="0.85">{_html_escape(mood_txt)}</text>
    <text x="60" y="600" font-size="24" opacity="0.7">{_html_escape(author)}</text>
    <text x="1140" y="600" text-anchor="end" font-size="22" opacity="0.6">lindart · ateliê de resina</text>
  </g>
  {swatches}
</svg>"""
    return StreamingResponse(
        iter([svg.encode("utf-8")]),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400, s-maxage=86400"},
    )


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

# Routers modulares (P2 — feed, marketplace, perfis públicos)
from routers.feed import router as feed_router  # noqa: E402
from routers.marketplace import router as marketplace_router  # noqa: E402
from routers.profiles import router as profiles_router  # noqa: E402

app.include_router(feed_router)
app.include_router(marketplace_router)
app.include_router(profiles_router)

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
