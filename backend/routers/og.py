"""Routers de Open Graph (cards de compartilhamento dinâmicos).

Expõe HTML com metatags `og:*` / `twitter:*` para que crawlers de
WhatsApp/Instagram/Facebook/X gerem preview rico do DNA Visual e dos itens
do Marketplace + a imagem SVG 1200×630 que serve de `og:image`.

Rotas:
- GET /api/og/dna/{share_id}                    → HTML com OG tags + redirect humano
- GET /api/og/dna/{share_id}/image.svg          → imagem SVG (cache 24h)
- GET /api/og/marketplace/{item_id}             → HTML com OG tags do item
- GET /api/og/marketplace/{item_id}/image.svg   → imagem SVG do item (cache 24h)
- GET /api/og/feed/{post_id}                    → HTML com OG tags do post de feed
- GET /api/og/feed/{post_id}/image.svg          → imagem SVG do post (cache 24h)
- GET /api/og/profile/{handle}                  → HTML com OG tags do perfil público
- GET /api/og/profile/{handle}/image.svg        → imagem SVG do perfil (cache 24h)
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape

from ._shared import db, normalize_handle

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


# ─────────────────────────── Marketplace OG ────────────────────────────

_HEX_RE = re.compile(r"#[0-9a-fA-F]{6}")

# Paleta curada por tipo (fallback quando tags não trazem hexes suficientes).
_TYPE_PALETTES: dict[str, List[str]] = {
    "molde": ["#c4b9a6", "#8b7355", "#d4c5b0"],
    "curso": ["#d4956a", "#c17f3e", "#8b5e3c"],
    "preset": ["#7ba7bc", "#5b8fa8", "#3d6b82"],
}
_DEFAULT_PALETTE = ["#c9a84c", "#8a7d6e", "#f2ede4"]

_TYPE_LABELS = {
    "molde": "Molde",
    "curso": "Curso",
    "preset": "Preset",
    "ebook": "E-book",
    "ferramenta": "Ferramenta",
    "outro": "Item",
}


def _market_swatches(item: dict) -> List[str]:
    """Extrai hexes válidos de `tags` (opção b). Faz fallback curado por
    `type` quando há menos de 3 cores."""
    tags = item.get("tags") or []
    colors: List[str] = []
    for t in tags:
        if not isinstance(t, str):
            continue
        for m in _HEX_RE.findall(t):
            c = m.lower()
            if c not in colors:
                colors.append(c)
        if len(colors) >= 6:
            break
    if len(colors) < 3:
        fallback = _TYPE_PALETTES.get((item.get("type") or "").lower(), _DEFAULT_PALETTE)
        for c in fallback:
            if c.lower() not in colors:
                colors.append(c.lower())
            if len(colors) >= 5:
                break
    return colors[:6]


def _format_brl(value) -> str:
    """Formata preço em BRL no padrão pt-BR (R$ 1.234,56). Retorna '' se inválido."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return ""
    if v <= 0:
        return ""
    inteiro, dec = f"{v:,.2f}".split(".")
    inteiro = inteiro.replace(",", ".")
    return f"R$ {inteiro},{dec}"


@router.get("/marketplace/{item_id}", response_class=HTMLResponse)
async def og_marketplace_page(item_id: str, request: Request):
    """Página HTML com Open Graph tags do item de marketplace.
    Crawlers leem os metatags; humanos são redirecionados para /marketplace."""
    origin = _absolute_origin(request)
    item = await db.marketplace_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        html = (
            '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            "<title>Item não encontrado · LindArt</title>"
            '<meta property="og:title" content="Item não encontrado">'
            '<meta property="og:description" content="Este item do marketplace expirou ou foi removido.">'
            f'<meta property="og:url" content="{origin}/marketplace">'
            '<meta http-equiv="refresh" content="0; url=/marketplace">'
            "</head><body>Item não encontrado.</body></html>"
        )
        return HTMLResponse(content=html, status_code=404)

    item_title = (item.get("title") or "Item LindArt").strip()[:80] or "Item LindArt"
    typ = (item.get("type") or "outro").lower()
    type_label = _TYPE_LABELS.get(typ, "Item")
    handle = item.get("handle")
    author_txt = f" — @{handle}" if handle else ""
    title = f"{item_title} · {type_label}{author_txt} — LindArt"

    price_txt = _format_brl(item.get("price_brl"))
    raw_desc = (item.get("description") or "").strip()
    desc_parts: List[str] = [type_label]
    if price_txt:
        desc_parts.append(price_txt)
    if raw_desc:
        desc_parts.append(raw_desc)
    else:
        desc_parts.append("Encontre no marketplace LindArt.")
    description = " · ".join(desc_parts)[:280]

    colors = _market_swatches(item)

    redirect_path = "/marketplace"
    redirect_abs = f"{origin}{redirect_path}" if origin else redirect_path
    og_image_abs = (
        f"{origin}/api/og/marketplace/{item_id}/image.svg"
        if origin
        else f"/api/og/marketplace/{item_id}/image.svg"
    )

    template = _jinja_env.get_template("market_og.html")
    html = template.render(
        title=title,
        item_title=item_title,
        type_label=type_label,
        description=description,
        colors=colors,
        price_txt=price_txt,
        price_amount=f"{float(item.get('price_brl')):.2f}" if price_txt else "",
        currency=(item.get("currency") or "BRL"),
        redirect_path=redirect_path,
        redirect_abs=redirect_abs,
        og_image_abs=og_image_abs,
    )
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=600, s-maxage=600"},
    )


@router.get("/marketplace/{item_id}/image.svg")
async def og_marketplace_image_svg(item_id: str):
    """Imagem OG (SVG) gerada a partir dos dados do item. 1200×630 para social."""
    item = await db.marketplace_items.find_one({"id": item_id}, {"_id": 0}) or {}
    item_title = (item.get("title") or "Marketplace LindArt").strip()[:60] or "Marketplace LindArt"
    typ = (item.get("type") or "outro").lower()
    type_label = _TYPE_LABELS.get(typ, "Item")
    handle = item.get("handle")
    author = f"@{handle}" if handle else "LindArt"
    price_txt = _format_brl(item.get("price_brl"))
    colors = _market_swatches(item) if item else list(_DEFAULT_PALETTE)
    if not colors:
        colors = list(_DEFAULT_PALETTE)

    stops = "".join(
        f'<stop offset="{int(i / max(1, len(colors) - 1) * 100)}%" stop-color="{_html_escape(c)}"/>'
        for i, c in enumerate(colors)
    )
    swatch_w = 1080 // max(1, len(colors))
    swatches = "".join(
        f'<rect x="{60 + i * swatch_w}" y="470" width="{swatch_w - 12}" height="80" fill="{_html_escape(c)}" rx="4"/>'
        for i, c in enumerate(colors)
    )

    price_node = (
        f'<text x="1140" y="260" text-anchor="end" font-size="48" font-weight="300" opacity="0.95">{_html_escape(price_txt)}</text>'
        if price_txt
        else ""
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
    <text x="60" y="120" font-size="28" letter-spacing="6" opacity="0.65">LINDART · MARKETPLACE</text>
    <text x="60" y="200" font-size="26" letter-spacing="4" opacity="0.75">{_html_escape(type_label.upper())}</text>
    <text x="60" y="300" font-size="64" font-weight="300" letter-spacing="2">{_html_escape(item_title)}</text>
    {price_node}
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


# ─────────────────────────────── Feed OG ───────────────────────────────


def _feed_swatches(post: dict) -> List[str]:
    """Extrai paleta válida do post (campo `palette_colors`). Fallback curado."""
    raw = post.get("palette_colors") or []
    colors: List[str] = []
    for c in raw:
        if isinstance(c, str) and _HEX_RE.fullmatch(c.strip()):
            cc = c.strip().lower()
            if cc not in colors:
                colors.append(cc)
        if len(colors) >= 6:
            break
    if len(colors) < 3:
        for c in _DEFAULT_PALETTE:
            if c.lower() not in colors:
                colors.append(c.lower())
            if len(colors) >= 5:
                break
    return colors[:6]


@router.get("/feed/{post_id}", response_class=HTMLResponse)
async def og_feed_page(post_id: str, request: Request):
    """Página HTML com Open Graph tags do post do feed.
    Crawlers (WhatsApp, IG, X, FB) leem os metatags; humanos são redirecionados
    para /feed#post-{post_id}."""
    origin = _absolute_origin(request)
    post = await db.feed_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        html = (
            '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            "<title>Post não encontrado · LindArt</title>"
            '<meta property="og:title" content="Post não encontrado">'
            '<meta property="og:description" content="Este post do feed expirou ou foi removido.">'
            f'<meta property="og:url" content="{origin}/feed">'
            '<meta http-equiv="refresh" content="0; url=/feed">'
            "</head><body>Post não encontrado.</body></html>"
        )
        return HTMLResponse(content=html, status_code=404)

    post_title = (post.get("title") or "Post LindArt").strip()[:80] or "Post LindArt"
    handle = post.get("handle")
    author_txt = f" — @{handle}" if handle else ""
    title = f"{post_title}{author_txt} — LindArt"

    colors = _feed_swatches(post)
    raw_desc = (post.get("description") or "").strip()
    desc_parts: List[str] = []
    if raw_desc:
        desc_parts.append(raw_desc)
    if colors:
        desc_parts.append("Paleta: " + " ".join(colors[:5]))
    desc_parts.append("Veja o post completo no feed do LindArt.")
    description = " · ".join(desc_parts)[:280]

    redirect_path = f"/feed#post-{post_id}"
    redirect_abs = f"{origin}{redirect_path}" if origin else redirect_path
    og_image_abs = (
        f"{origin}/api/og/feed/{post_id}/image.svg"
        if origin
        else f"/api/og/feed/{post_id}/image.svg"
    )

    # Reaproveita template dna_og.html (estrutura idêntica: title/desc/colors/redirect).
    template = _jinja_env.get_template("dna_og.html")
    html = template.render(
        signature=post_title,
        title=title,
        description=description,
        colors=colors,
        redirect_path=redirect_path,
        redirect_abs=redirect_abs,
        og_image_abs=og_image_abs,
    )
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=600, s-maxage=600"},
    )


@router.get("/feed/{post_id}/image.svg")
async def og_feed_image_svg(post_id: str):
    """Imagem OG (SVG) do post de feed. 1200×630 para social."""
    post = await db.feed_posts.find_one({"id": post_id}, {"_id": 0}) or {}
    post_title = (post.get("title") or "Post LindArt").strip()[:60] or "Post LindArt"
    handle = post.get("handle")
    author = f"@{handle}" if handle else "LindArt"
    colors = _feed_swatches(post) if post else list(_DEFAULT_PALETTE)
    if not colors:
        colors = list(_DEFAULT_PALETTE)

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
    <text x="60" y="120" font-size="28" letter-spacing="6" opacity="0.65">LINDART · FEED</text>
    <text x="60" y="280" font-size="64" font-weight="300" letter-spacing="2">{_html_escape(post_title)}</text>
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


# ───────────────────────────── Profile OG ─────────────────────────────


async def _profile_signature_palette(handle: str, limit_posts: int = 24) -> List[str]:
    """Agrega top cores do handle (posts + DNAs). Mesma lógica de profiles.py
    em escala reduzida para o crawler. Retorna até 6 hex únicos lowercase."""
    color_counts: dict[str, int] = {}

    posts = await db.feed_posts.find(
        {"handle": handle}, {"_id": 0, "palette_colors": 1}
    ).sort("created_at", -1).limit(limit_posts).to_list(limit_posts)
    for p in posts:
        for c in p.get("palette_colors", []) or []:
            if isinstance(c, str) and _HEX_RE.fullmatch(c.strip()):
                key = c.strip().lower()
                color_counts[key] = color_counts.get(key, 0) + 1

    dnas = await db.dna_shares.find(
        {"handle": handle}, {"_id": 0, "payload": 1}
    ).sort("created_at", -1).limit(6).to_list(6)
    for d in dnas:
        for c in (d.get("payload") or {}).get("dominant_colors", []) or []:
            if isinstance(c, str) and _HEX_RE.fullmatch(c.strip()):
                key = c.strip().lower()
                color_counts[key] = color_counts.get(key, 0) + 2  # peso maior

    if not color_counts:
        return []
    return [c for c, _ in sorted(color_counts.items(), key=lambda kv: -kv[1])[:6]]


async def _profile_summary(handle: str) -> Optional[dict]:
    """Retorna {posts, dnas, market, total_likes} ou None se handle inexistente em
    todas as coleções."""
    posts_count = await db.feed_posts.count_documents({"handle": handle})
    dnas_count = await db.dna_shares.count_documents({"handle": handle})
    market_count = await db.marketplace_items.count_documents({"handle": handle})
    subs_count = await db.challenge_submissions.count_documents({"handle": handle})
    if not any([posts_count, dnas_count, market_count, subs_count]):
        return None
    likes_agg = await db.feed_posts.aggregate([
        {"$match": {"handle": handle}},
        {"$group": {"_id": None, "total": {"$sum": "$likes"}}},
    ]).to_list(1)
    total_likes = int(likes_agg[0]["total"]) if likes_agg else 0
    return {
        "posts": posts_count,
        "dnas": dnas_count,
        "market": market_count,
        "subs": subs_count,
        "total_likes": total_likes,
    }


@router.get("/profile/{handle}", response_class=HTMLResponse)
async def og_profile_page(handle: str, request: Request):
    """Página HTML com Open Graph tags do perfil público @handle.
    Crawlers leem os metatags; humanos são redirecionados para /u/{handle}."""
    origin = _absolute_origin(request)
    h = normalize_handle(handle)
    if not h:
        html = (
            '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            "<title>Handle inválido · LindArt</title>"
            '<meta property="og:title" content="Handle inválido">'
            '<meta property="og:description" content="Esse identificador de artista não é válido.">'
            f'<meta property="og:url" content="{origin}/feed">'
            '<meta http-equiv="refresh" content="0; url=/feed">'
            "</head><body>Handle inválido.</body></html>"
        )
        return HTMLResponse(content=html, status_code=400)

    summary = await _profile_summary(h)
    redirect_path = f"/u/{h}"
    redirect_abs = f"{origin}{redirect_path}" if origin else redirect_path
    og_image_abs = (
        f"{origin}/api/og/profile/{h}/image.svg"
        if origin
        else f"/api/og/profile/{h}/image.svg"
    )

    if not summary:
        html = (
            f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            f"<title>@{_html_escape(h)} — Perfil ainda vazio · LindArt</title>"
            f'<meta property="og:title" content="@{_html_escape(h)} — Perfil ainda vazio">'
            f'<meta property="og:description" content="Esse artista ainda não publicou peças, DNAs ou itens no LindArt.">'
            f'<meta property="og:url" content="{redirect_abs}">'
            f'<meta property="og:image" content="{og_image_abs}">'
            f'<meta http-equiv="refresh" content="0; url={redirect_path}">'
            f"</head><body>Perfil ainda vazio.</body></html>"
        )
        return HTMLResponse(content=html, status_code=404)

    palette = await _profile_signature_palette(h)
    if len(palette) < 3:
        for c in _DEFAULT_PALETTE:
            if c.lower() not in palette:
                palette.append(c.lower())
            if len(palette) >= 5:
                break

    title = f"@{h} — Artista LindArt"
    parts: List[str] = []
    if summary["posts"]:
        parts.append(f"{summary['posts']} peça(s)")
    if summary["dnas"]:
        parts.append(f"{summary['dnas']} DNA(s)")
    if summary["market"]:
        parts.append(f"{summary['market']} no marketplace")
    if summary["total_likes"]:
        parts.append(f"{summary['total_likes']} curtidas")
    parts.append("Veja o portfólio completo no LindArt.")
    description = " · ".join(parts)[:280]

    template = _jinja_env.get_template("dna_og.html")
    html = template.render(
        signature=f"@{h}",
        title=title,
        description=description,
        colors=palette,
        redirect_path=redirect_path,
        redirect_abs=redirect_abs,
        og_image_abs=og_image_abs,
    )
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=600, s-maxage=600"},
    )


@router.get("/profile/{handle}/image.svg")
async def og_profile_image_svg(handle: str):
    """Imagem OG (SVG) do perfil. 1200×630. Usa paleta assinatura agregada."""
    h = normalize_handle(handle) or handle.strip().lower()
    summary = await _profile_summary(h) if h else None
    palette = (await _profile_signature_palette(h)) if h else []
    if len(palette) < 3:
        palette = palette + [c for c in _DEFAULT_PALETTE if c.lower() not in palette]
    palette = palette[:6] or list(_DEFAULT_PALETTE)

    stops = "".join(
        f'<stop offset="{int(i / max(1, len(palette) - 1) * 100)}%" stop-color="{_html_escape(c)}"/>'
        for i, c in enumerate(palette)
    )
    swatch_w = 1080 // max(1, len(palette))
    swatches = "".join(
        f'<rect x="{60 + i * swatch_w}" y="470" width="{swatch_w - 12}" height="80" fill="{_html_escape(c)}" rx="4"/>'
        for i, c in enumerate(palette)
    )

    stats_line = ""
    if summary:
        bits: List[str] = []
        if summary["posts"]:
            bits.append(f"{summary['posts']} peças")
        if summary["dnas"]:
            bits.append(f"{summary['dnas']} DNAs")
        if summary["total_likes"]:
            bits.append(f"{summary['total_likes']} curtidas")
        stats_line = " · ".join(bits)

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
    <text x="60" y="120" font-size="28" letter-spacing="6" opacity="0.65">LINDART · ARTISTA</text>
    <text x="60" y="280" font-size="80" font-weight="300" letter-spacing="2">@{_html_escape(h)}</text>
    <text x="60" y="340" font-size="26" opacity="0.75">{_html_escape(stats_line)}</text>
    <text x="60" y="600" font-size="22" opacity="0.7">Paleta assinatura</text>
    <text x="1140" y="600" text-anchor="end" font-size="22" opacity="0.6">lindart · ateliê de resina</text>
  </g>
  {swatches}
</svg>"""
    return StreamingResponse(
        iter([svg.encode("utf-8")]),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400, s-maxage=86400"},
    )
