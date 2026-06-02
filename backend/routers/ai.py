"""Routers de IA — geração de paleta, imagem, voz, captions, score de luxo,
DNA visual, mentora, tendências, coleções e share de DNA.

Extraído do `server.py` monolítico em Fev/2026 (modularização P2 fase 2).
Helpers (`_map_llm_exception`, `_parse_llm_json`, cálculos heurísticos de luxo
e clustering de cores dominantes) ficam neste módulo por enquanto — caso
sejam necessários em outros routers, mover para `_shared.py`.

Rotas:
- POST /api/ai/generate-palette
- POST /api/ai/generate-voice
- POST /api/ai/transcribe        (multipart)
- POST /api/ai/generate-image
- POST /api/ai/generate-caption
- POST /api/ai/luxury-score
- POST /api/ai/visual-dna
- POST /api/ai/mentora
- POST /api/ai/trends
- POST /api/ai/collection
- POST /api/dna/share
- GET  /api/dna/share/{share_id}
"""
from __future__ import annotations

import base64 as b64
import io
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional

# from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage
# from emergentintegrations.llm.openai import OpenAISpeechToText
# from emergentintegrations.llm.openai.text_to_speech import OpenAITextToSpeech
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from ._shared import ColorSwatch, Palette, db

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

router = APIRouter(prefix="/api", tags=["ai"])


# ============================================================
# Helpers — mapeamento de exceções LLM e parser tolerante de JSON.
# ============================================================
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
                    j = i + 1
                    while j < len(src) and src[j] in " \t\r\n":
                        j += 1
                    nxt = src[j] if j < len(src) else ""
                    if nxt in (",", ":", "}", "]", ""):
                        out.append(ch)
                        in_str = False
                    else:
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


# ============================================================
# Modelos Pydantic
# ============================================================
class AIPromptRequest(BaseModel):
    prompt: Optional[str] = ""
    style: Optional[str] = None
    image_base64: Optional[str] = None  # imagem opcional para extração de paleta via visão


class VoiceRequest(BaseModel):
    text: str
    voice: Optional[str] = "nova"
    speed: Optional[float] = 1.0


class ImageRequest(BaseModel):
    prompt: str
    colors: Optional[List[str]] = None
    shape: Optional[str] = "gota"
    style: Optional[str] = None
    palette_name: Optional[str] = None


class CaptionRequest(BaseModel):
    palette_name: Optional[str] = None
    colors: List[str] = []
    piece: Optional[str] = "joia de resina"
    style: Optional[str] = None
    platform: Optional[str] = "instagram"
    tone: Optional[str] = "luxuoso"
    language: Optional[str] = "pt-BR"


class LuxuryScoreRequest(BaseModel):
    palette_name: Optional[str] = None
    colors: List[str] = []
    description: Optional[str] = ""
    style: Optional[str] = None


class VisualDNARequest(BaseModel):
    """Analisa um conjunto de paletas e retorna a 'linguagem visual'."""
    palettes: List[dict] = []
    handle: Optional[str] = None


class DNAShareIn(BaseModel):
    payload: dict
    handle: Optional[str] = None


class MentoraMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class MentoraRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    history: Optional[List[MentoraMessage]] = None
    image_base64: Optional[str] = None


class TrendsRequest(BaseModel):
    refresh: bool = False
    focus: Optional[str] = None


class CollectionRequest(BaseModel):
    theme: str
    pieces: Optional[List[str]] = None


# ============================================================
# /api/ai/generate-palette
# ============================================================
@router.post("/ai/generate-palette", response_model=Palette)
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

    raw = response.strip()
    data = _parse_llm_json(raw)
    if not data:
        logger.error(f"Palette AI: parser falhou. Raw (200ch): {raw[:200]!r}")
        raise HTTPException(status_code=502, detail="A IA retornou um formato inesperado. Tente novamente.")

    palette = Palette(
        name=data.get("name", "Paleta IA"),
        description=data.get("description", ""),
        colors=[ColorSwatch(**c) for c in data.get("colors", [])],
        style=data.get("style", "luxo"),
        tags=data.get("tags", []),
        source="ai",
    )
    return palette


# ============================================================
# /api/ai/generate-voice (TTS)
# ============================================================
@router.post("/ai/generate-voice")
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


# ============================================================
# /api/ai/transcribe (Whisper STT)
# ============================================================
_MAX_AUDIO_BYTES = 25 * 1024 * 1024
_AUDIO_EXTS_MAP = {
    "audio/webm": "webm",
    "audio/ogg": "webm",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
}


@router.post("/ai/transcribe")
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


# ============================================================
# /api/ai/generate-image (Gemini Nano Banana)
# ============================================================
_SHAPE_DESCRIPTIONS = {
    "geodo": (
        "uma peça decorativa em formato de geodo natural irregular, bordas brutas "
        "e orgânicas com acabamento dourado metálico fino, interior preenchido com "
        "camadas de resina translúcida revelando cristais facetados e veios minerais, "
        "vista de cima sobre superfície de mármore claro"
    ),
    "bandeja": (
        "uma bandeja redonda catch-all de resina epóxi (cerca de 12cm de diâmetro), "
        "bordas perfeitamente arredondadas com fio dourado polido, superfície "
        "lisa e espelhada, vista em ângulo 3/4 sobre mesa de madeira escura, "
        "pequena sombra projetada"
    ),
    "colar": (
        "um pingente de resina em formato de gota suspenso por uma corrente "
        "delicada de ouro 18k, a peça translúcida com profundidade de cor e "
        "reflexos internos, fotografado contra fundo neutro com leve vinheta, "
        "joalheria fine-art"
    ),
    "gota": (
        "um pingente em formato de gota alongada de resina epóxi com fio "
        "metálico dourado contornando a borda, translúcido com reflexos "
        "internos visíveis, vista frontal sobre fundo escuro"
    ),
    "anel": (
        "um anel statement de resina epóxi montado em base de prata 925 "
        "polida, peça superior oval com profundidade translúcida, foco "
        "macro com bokeh suave"
    ),
    "drop": "um pingente formato gota com fio dourado, joalheria fine-art",
    "hex": "um pingente hexagonal geométrico com bordas douradas e superfície de resina translúcida",
    "ring": "um anel statement com peça superior arredondada em resina translúcida",
    "oval": "um brinco oval translúcido com fio metálico contornando a borda",
    "bracelet": "um bracelete circular rígido em resina epóxi com inclusões metálicas",
    "moon": "um pingente em formato de lua crescente com acabamento dourado nas pontas",
    "star": "um pingente estrela de cinco pontas com bordas douradas e centro translúcido",
    "heart": "um pingente coração de resina com gradiente interno e fio dourado",
    "leaf": "um pingente em formato de folha com nervuras douradas e resina translúcida",
    "feather": "um pingente pena alongado com detalhes finos e fio metálico",
    "bookmark": "um marcador de livro retangular alongado de resina com fita dourada",
    "circle": "um chaveiro circular de resina com argola metálica dourada",
}

_STYLE_DESCRIPTIONS = {
    "geodo": "acabamento estilo geodo: cristais facetados visíveis, bordas brutas, veios dourados percorrendo a peça",
    "marmore": "acabamento estilo mármore: veios fluidos brancos e dourados se entrelaçando suavemente, superfície polida espelhada",
    "oceano": "acabamento estilo oceano: ondas líquidas em camadas, transparência azul profunda com espuma branca cristalizada",
    "galaxia": "acabamento estilo galáxia: nebulosa profunda com micro-glitter holográfico simulando estrelas, gradiente cósmico",
    "floral": "acabamento estilo floral: flores secas naturais embebidas em resina cristalina, composição orgânica",
    "metalico": "acabamento metálico: mica em pó com brilho intenso, reflexos cromados, superfície vibrante",
    "acido": "acabamento ácido neon: cores vibrantes saturadas, gradiente psicodélico com alto contraste",
    "pastel": "acabamento pastel suave: cores leves e leitosas, superfície fosca delicada",
    "boho": "acabamento boho: tons terrosos naturais com inclusões orgânicas (flores secas, folhas), textura artesanal",
    "luxo": "acabamento luxo joalheria: dourado profundo, alto brilho, reflexos espelhados, profundidade de cor intensa",
    "minimalista": "acabamento minimalista: cristalino translúcido, formas limpas, sem inclusões, elegância silenciosa",
    "pave-cristais": "acabamento pavé: strass minúsculos embutidos cobrindo toda a superfície como joalheria fine",
    "foil-dourado": "acabamento foil dourado: folhas de ouro fragmentadas suspensas dentro da resina, texturas metálicas brilhantes",
    "holografico": "acabamento holográfico: superfície iridescente com arco-íris suave que reflete diferentes cores conforme o ângulo",
    "espelhado": "acabamento espelhado cromo: superfície totalmente reflexiva como metal polido",
}


@router.post("/ai/generate-image")
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
    shape_desc = _SHAPE_DESCRIPTIONS.get(
        shape, f"uma peça artesanal de resina epóxi premium em formato de {shape}"
    )

    style_part = ""
    style_key = (req.style or "").lower().strip()
    if style_key and style_key in _STYLE_DESCRIPTIONS:
        style_part = f" Acabamento: {_STYLE_DESCRIPTIONS[style_key]}."

    palette_label = (req.palette_name or "").strip()
    palette_part = f" Paleta '{palette_label}'." if palette_label else ""

    prompt = (
        f"Fotografia profissional de produto, hiper-realista 4k, de {shape_desc}."
        f"{palette_part}{style_part}{colors_part} "
        "Iluminação de estúdio suave (softbox lateral + rim light dourado), "
        "fundo neutro escuro com leve gradiente, profundidade de campo rasa, "
        "reflexos sutis na superfície, sombra suave projetada, "
        "estética de e-commerce de joalheria de luxo. "
        "A peça DEVE ser claramente reconhecível como um objeto físico tridimensional, "
        "NÃO uma textura abstrata, NÃO uma ilustração plana, NÃO arte digital."
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


# ============================================================
# /api/ai/generate-caption (Claude — copy + hashtags)
# ============================================================
@router.post("/ai/generate-caption")
async def generate_caption(req: CaptionRequest):
    """Gera legenda + hashtags prontas para redes sociais usando Claude."""
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
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        headline = (lines[0] if lines else "Inspiração em resina").strip("\"'#* ")[:80]
        caption_text = re.sub(r"[{}]", " ", raw).strip()
        if len(caption_text) > 600:
            caption_text = caption_text[:600].rsplit(" ", 1)[0] + "…"
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


# ============================================================
# Helpers de Luxury Score / Visual DNA (heurística cromática).
# ============================================================
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

    contrast = (max(ls) - min(ls)) * 100

    has_dark = any(l < 0.20 for l in ls)
    has_light = any(l > 0.80 for l in ls)
    depth = 60 + (20 if has_dark else 0) + (10 if has_light else 0)
    depth = min(100, depth)

    avg_sat = sum(ss) / len(ss)
    sophistication = 100 - max(0, (avg_sat - 0.55)) * 120
    sophistication = max(20, min(100, sophistication))

    hues = sorted([x[0] for x in hsls])
    diffs = [hues[i + 1] - hues[i] for i in range(len(hues) - 1)] if len(hues) > 1 else [0]

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


@router.post("/ai/luxury-score")
async def luxury_score(req: LuxuryScoreRequest):
    """Calcula o Luxury Score (0-100) de uma paleta.

    Combina heurística cromática determinística + parecer poético da IA (Claude).
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


# ============================================================
# Visual DNA — clustering de cores + insights IA.
# ============================================================
def _hex_distance(a: tuple, b: tuple) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def _cluster_dominant_colors(hexes: List[str], k: int = 6) -> List[dict]:
    """K-means-lite (greedy farthest-point) para extrair cores dominantes."""
    rgbs = [c for c in (_hex_to_rgb(h) for h in hexes) if c]
    if not rgbs:
        return []
    centers = [rgbs[0]]
    for _ in range(min(k - 1, len(rgbs) - 1)):
        best, best_d = None, -1
        for c in rgbs:
            d = min(_hex_distance(c, ctr) for ctr in centers)
            if d > best_d:
                best_d, best = d, c
        if best is not None and best not in centers:
            centers.append(best)
        else:
            break
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


@router.post("/ai/visual-dna")
async def visual_dna(req: VisualDNARequest):
    """Analisa as paletas do usuário e retorna a 'linguagem visual' dele."""
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


# ============================================================
# Mentora IA do Ateliê — chat especializado.
# ============================================================
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


@router.post("/ai/mentora")
async def mentora_chat(req: MentoraRequest):
    """Chat com a Mentora IA do Ateliê (Claude Sonnet 4.5)."""
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
# Tendências da Semana — curadoria IA (cache 24h).
# ============================================================
_TRENDS_CACHE: dict = {"key": None, "data": None, "ts": 0.0}
_TRENDS_TTL_SECONDS = 60 * 60 * 24


@router.post("/ai/trends")
async def ai_trends(req: TrendsRequest):
    """Retorna 5 paletas em tendência para resina epóxi (curadoria IA)."""
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
# Gerador de Coleções (Claude).
# ============================================================
@router.post("/ai/collection")
async def ai_collection(req: CollectionRequest):
    """Cria uma coleção coerente: paleta + descrição de cada peça."""
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

# NOTE: As rotas POST /api/dna/share e GET /api/dna/share/{share_id} continuam
# vivendo em server.py (não são endpoints de IA). Duplicatas removidas em
# 2026-01 durante a regressão da extração P2 do router AI.
