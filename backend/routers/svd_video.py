"""Router de Stable Video Diffusion 2.0 (fal.ai).

Inclui:
- POST /api/ai/generate-video                  → enfileira job SVD (background)
- GET  /api/ai/video-status/{job_id}           → polling do job
- GET  /api/onboarding/welcome-video           → estado do vídeo institucional
- POST /api/onboarding/generate-welcome-video  → dispara geração do vídeo institucional

Estado dos jobs vive em memória do processo (in-memory dicts). Suficiente para
single-worker uvicorn em dev/preview. Para multi-worker, migrar para Mongo/Redis.
"""
from __future__ import annotations

import base64 as b64
import io
import logging
import math
import os
import time
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import fal_client
from fastapi import APIRouter, BackgroundTasks, HTTPException
from PIL import Image, ImageDraw, ImageFilter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT_DIR / "static_assets"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
WELCOME_VIDEO_PATH = STATIC_DIR / "onboarding-welcome.mp4"


# ===== Modelo de request =====
class VideoRequest(BaseModel):
    color_a: str
    color_b: str
    duration: Optional[int] = 4  # 4 | 8 | 12
    size: Optional[str] = "1280x720"


# ===== Estado in-memory =====
_VIDEO_JOBS: dict[str, dict] = {}
_VIDEO_JOB_TTL_SECONDS = 3600  # 1h: jobs concluídos/com erro são limpos depois disso
_VIDEO_JOBS_MAX = 200  # hard cap para evitar leak de memória
SVD_MODEL = "fal-ai/stable-video"  # Stable Video Diffusion 2.0 hospedado no fal.ai
SVD_DEFAULT_SIZE = (1024, 576)  # 16:9, dentro do range suportado pelo SVD

_WELCOME_JOB: dict = {"status": "idle"}  # status: idle | processing | completed | error


def _fal_key() -> Optional[str]:
    """Lê FAL_KEY em runtime. Se presente, garante exposição em os.environ
    para o fal_client SDK pegar automaticamente."""
    key = os.environ.get("FAL_KEY")
    if key:
        os.environ["FAL_KEY"] = key
    return key


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
        if not _fal_key():
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


def _run_welcome_video_job() -> None:
    """Gera vídeo institucional via SVD 2.0 para o onboarding e salva em static_assets."""
    global _WELCOME_JOB
    try:
        if not _fal_key():
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


router = APIRouter(prefix="/api", tags=["svd-video"])


@router.post("/ai/generate-video")
async def generate_video(req: VideoRequest, background_tasks: BackgroundTasks):
    """Dispara geração de vídeo via Stable Video Diffusion 2.0 (fal.ai) em background.
    Retorna {job_id} imediatamente.

    O cliente deve fazer polling em GET /api/ai/video-status/{job_id}
    a cada ~5s até receber status == 'completed' (com video_base64) ou 'error'.
    """
    if not _fal_key():
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


@router.get("/ai/video-status/{job_id}")
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


@router.get("/onboarding/welcome-video")
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


@router.post("/onboarding/generate-welcome-video")
async def onboarding_generate_welcome_video(background_tasks: BackgroundTasks):
    """Dispara geração do vídeo institucional via SVD 2.0 em background.

    Idempotente: se um job já está em processamento, retorna o estado atual.
    Se o vídeo já existe, retorna `already_exists=True`. Para regerar, deletar o arquivo
    em `/app/backend/static_assets/onboarding-welcome.mp4` antes.
    """
    global _WELCOME_JOB
    # Reorder: check existing file / running job BEFORE FAL_KEY — idempotência
    # garante 200 mesmo sem FAL_KEY configurada quando o vídeo já foi gerado.
    if WELCOME_VIDEO_PATH.exists() and WELCOME_VIDEO_PATH.stat().st_size > 0:
        return {
            "already_exists": True,
            "url": "/api/static/onboarding-welcome.mp4",
        }
    if _WELCOME_JOB.get("status") == "processing":
        return {"status": "processing", "started_at": _WELCOME_JOB.get("started_at")}

    if not _fal_key():
        raise HTTPException(
            status_code=503,
            detail="FAL_KEY não configurada (https://fal.ai/dashboard/keys).",
        )

    _WELCOME_JOB = {
        "status": "processing",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(_run_welcome_video_job)
    logger.info("Welcome video generation queued")
    return {"status": "processing", "started_at": _WELCOME_JOB["started_at"]}
