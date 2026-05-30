"""Rotas de sistema do LindArt API.

Concentra endpoints utilitários da plataforma:
- ``GET /api/``                  → healthcheck simples.
- ``GET /api/download/source``   → zip do código-fonte (backend + frontend)
  sem segredos, útil para o usuário fazer download local do projeto.
"""
from __future__ import annotations

import io
import logging
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api", tags=["system"])
logger = logging.getLogger(__name__)


@router.get("/")
async def root():
    return {"message": "LindArt API online", "version": "1.0"}


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


@router.get("/download/source")
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
