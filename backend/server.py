from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
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
from emergentintegrations.llm.openai import OpenAISpeechToText
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


@api_router.post("/dna/share")
async def create_dna_share(req: DNAShareIn):
    """Salva um snapshot do DNA Visual para compartilhamento público."""
    if not req.payload or not isinstance(req.payload, dict):
        raise HTTPException(status_code=400, detail="payload inválido")
    share_id = uuid.uuid4().hex[:10]
    doc = {
        "id": share_id,
        "payload": req.payload,
        "handle": (req.handle or "").strip()[:40] or None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.dna_shares.insert_one(doc)
    return {"id": share_id, "path": f"/dna/{share_id}"}


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
