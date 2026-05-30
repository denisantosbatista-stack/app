"""Routers de Open Graph (cards de compartilhamento dinâmicos).

Expõe HTML com metatags `og:*` / `twitter:*` para que crawlers de
WhatsApp/Instagram/Facebook/X gerem preview rico do DNA Visual e a imagem
SVG 1200×630 que serve de `og:image`.

Rotas:
- GET /api/og/dna/{share_id}            → HTML com OG tags + redirect humano
- GET /api/og/dna/{share_id}/image.svg  → imagem SVG (cache 24h)
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape

from ._shared import db

ROOT_DIR = Path(__file__).resolve().parent.parent

# Jinja2 env próprio do router — escopo local, sem depender de globals do server.py.
_jinja_env = Environment(
    loader=FileSystemLoader(str(ROOT_DIR / "templates")),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


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
    """Renderiza HTML com OG tags dinâmicas via template Jinja2.
    Crawlers (WhatsApp, IG, X, FB) leem os metatags; humanos são redirecionados
    para /dna/{share_id} via meta refresh + JS."""
    signature = (payload.get("signature") or "DNA Visual").strip()[:80] or "DNA Visual"
    mood_list = payload.get("mood") or []
    mood_txt = " · ".join([m for m in mood_list if isinstance(m, str)][:4])
    colors = [
        c for c in (payload.get("dominant_colors") or [])
        if isinstance(c, str) and c.startswith("#")
    ][:6]

    author_txt = f" — @{handle}" if handle else ""
    title = f"{signature} · DNA Visual{author_txt} — LindArt"

    desc_parts = []
    if mood_txt:
        desc_parts.append(mood_txt)
    if colors:
        desc_parts.append("Paleta: " + " ".join(colors))
    desc_parts.append("Descubra seu DNA Visual em resina no LindArt.")
    description = " · ".join(desc_parts)[:280]

    # URLs absolutas (obrigatório para crawlers WhatsApp/IG/FB)
    redirect_path = f"/dna/{share_id}"
    redirect_abs = f"{origin}{redirect_path}" if origin else redirect_path
    og_image_abs = (
        f"{origin}/api/og/dna/{share_id}/image.svg"
        if origin
        else f"/api/og/dna/{share_id}/image.svg"
    )

    template = _jinja_env.get_template("dna_og.html")
    return template.render(
        signature=signature,
        title=title,
        description=description,
        colors=colors,
        redirect_path=redirect_path,
        redirect_abs=redirect_abs,
        og_image_abs=og_image_abs,
    )


router = APIRouter(prefix="/api/og", tags=["og"])


@router.get("/dna/{share_id}", response_class=HTMLResponse)
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


@router.get("/dna/{share_id}/image.svg")
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
