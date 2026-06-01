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

# Import lazy do cache de tendências (LLM-gerado, sem persistência). Importar
# em runtime nas funções para evitar circular import com routers/ai.py.

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
        og_alt=f"{signature} — DNA Visual em resina",
    )


# ─────────────────────── Shared helpers (404 + SVG) ─────────────────────


def _og_404_html(
    *,
    title: str,
    description: str,
    redirect_path: str,
    origin: str,
    status: int = 404,
) -> HTMLResponse:
    """Resposta HTML mínima para crawlers quando o recurso não existe.
    Mantém og:title/og:description/og:url + refresh para que o link nunca
    quebre no WhatsApp/IG, mesmo apagado."""
    t = _html_escape(title)
    d = _html_escape(description)
    url_abs = f"{origin}{redirect_path}" if origin else redirect_path
    html = (
        f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        f"<title>{t} · LindArt</title>"
        f'<meta property="og:title" content="{t}">'
        f'<meta property="og:description" content="{d}">'
        f'<meta property="og:url" content="{url_abs}">'
        f'<meta http-equiv="refresh" content="0; url={redirect_path}">'
        f"</head><body>{t}.</body></html>"
    )
    return HTMLResponse(content=html, status_code=status)


def _build_og_palette_svg(
    *,
    eyebrow: str,
    title_text: str,
    title_size: int = 64,
    title_y: int = 280,
    subtitle: str = "",
    subtitle_y: int = 340,
    subtitle_size: int = 26,
    footer_left: str = "",
    footer_right: str = "lindart · ateliê de resina",
    colors: List[str],
    extras_svg: str = "",
) -> str:
    """SVG OG 1200×630 com gradiente vertical da paleta + grain + swatches.
    Layout comum a DNA / Marketplace / Feed / Profile, parametrizado para
    cada variação textual. `extras_svg` permite injetar nós <text> extras
    (ex.: preço no marketplace, segundo eyebrow)."""
    palette = colors or list(_DEFAULT_PALETTE)
    last = max(1, len(palette) - 1)
    stops = "".join(
        f'<stop offset="{int(i / last * 100)}%" stop-color="{_html_escape(c)}"/>'
        for i, c in enumerate(palette)
    )
    swatch_w = 1080 // max(1, len(palette))
    swatches = "".join(
        f'<rect x="{60 + i * swatch_w}" y="470" width="{swatch_w - 12}" '
        f'height="80" fill="{_html_escape(c)}" rx="4"/>'
        for i, c in enumerate(palette)
    )
    subtitle_node = (
        f'<text x="60" y="{subtitle_y}" font-size="{subtitle_size}" opacity="0.85">'
        f"{_html_escape(subtitle)}</text>"
        if subtitle
        else ""
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient>
    <filter id="grain"><feTurbulence baseFrequency="0.9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="#000" opacity="0.45"/>
  <rect width="1200" height="630" filter="url(#grain)"/>
  <g font-family="Georgia, 'Times New Roman', serif" fill="#f4f1ea">
    <text x="60" y="120" font-size="28" letter-spacing="6" opacity="0.65">{_html_escape(eyebrow)}</text>
    <text x="60" y="{title_y}" font-size="{title_size}" font-weight="300" letter-spacing="2">{_html_escape(title_text)}</text>
    {subtitle_node}
    <text x="60" y="600" font-size="24" opacity="0.7">{_html_escape(footer_left)}</text>
    <text x="1140" y="600" text-anchor="end" font-size="22" opacity="0.6">{_html_escape(footer_right)}</text>
    {extras_svg}
  </g>
  {swatches}
</svg>"""


def _svg_response(svg: str) -> StreamingResponse:
    """StreamingResponse padrão p/ SVGs OG (cache 24h)."""
    return StreamingResponse(
        iter([svg.encode("utf-8")]),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400, s-maxage=86400"},
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
        return _og_404_html(
            title="DNA não encontrado",
            description="Este DNA Visual expirou ou foi removido.",
            redirect_path="/",
            origin=origin,
        )
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

    svg = _build_og_palette_svg(
        eyebrow="LINDART · DNA VISUAL",
        title_text=signature,
        title_size=76,
        title_y=260,
        subtitle=mood_txt,
        subtitle_y=320,
        subtitle_size=30,
        footer_left=author,
        colors=colors,
    )
    return _svg_response(svg)


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
        return _og_404_html(
            title="Item não encontrado",
            description="Este item do marketplace expirou ou foi removido.",
            redirect_path="/marketplace",
            origin=origin,
        )

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

    price_node = (
        f'<text x="1140" y="260" text-anchor="end" font-size="48" font-weight="300" opacity="0.95">{_html_escape(price_txt)}</text>'
        if price_txt
        else ""
    )
    type_eyebrow = (
        f'<text x="60" y="200" font-size="26" letter-spacing="4" opacity="0.75">{_html_escape(type_label.upper())}</text>'
    )

    svg = _build_og_palette_svg(
        eyebrow="LINDART · MARKETPLACE",
        title_text=item_title,
        title_size=64,
        title_y=300,
        footer_left=author,
        colors=colors,
        extras_svg=type_eyebrow + price_node,
    )
    return _svg_response(svg)


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
        return _og_404_html(
            title="Post não encontrado",
            description="Este post do feed expirou ou foi removido.",
            redirect_path="/feed",
            origin=origin,
        )

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

    # `dna_og.html` agora é template genérico (DNA/feed/profile); só passamos
    # og_alt customizado por tipo para corrigir a tag semântica.
    template = _jinja_env.get_template("dna_og.html")
    html = template.render(
        signature=post_title,
        title=title,
        description=description,
        colors=colors,
        redirect_path=redirect_path,
        redirect_abs=redirect_abs,
        og_image_abs=og_image_abs,
        og_alt=f"{post_title} — Post no feed LindArt",
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

    svg = _build_og_palette_svg(
        eyebrow="LINDART · FEED",
        title_text=post_title,
        title_size=64,
        title_y=280,
        footer_left=author,
        colors=colors,
    )
    return _svg_response(svg)


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
        return _og_404_html(
            title="Handle inválido",
            description="Esse identificador de artista não é válido.",
            redirect_path="/feed",
            origin=origin,
            status=400,
        )

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
        og_alt=f"Paleta assinatura de @{h} no LindArt",
    )
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=600, s-maxage=600"},
    )


# ─────────────────────── Aliases públicos (piece/palette) ───────────────────
# Os clients externos (campanhas, fluxos antigos, share-tracking E2E) podem
# referenciar `piece` (item do marketplace) e `palette` (DNA Visual). Mantemos
# como aliases finos para não duplicar template/SVG e preservar 100% das rotas
# existentes.


@router.get("/piece/{piece_id}", response_class=HTMLResponse)
async def og_piece_page(piece_id: str, request: Request):
    """Alias de `/api/og/marketplace/{item_id}`. `piece` == item do marketplace."""
    return await og_marketplace_page(piece_id, request)


@router.get("/piece/{piece_id}/image.svg")
async def og_piece_image_svg(piece_id: str):
    """Alias da imagem OG de marketplace."""
    return await og_marketplace_image_svg(piece_id)


@router.get("/palette/{palette_id}", response_class=HTMLResponse)
async def og_palette_page(palette_id: str, request: Request):
    """Alias de `/api/og/dna/{share_id}`. `palette` == DNA Visual."""
    return await og_dna_page(palette_id, request)


@router.get("/palette/{palette_id}/image.svg")
async def og_palette_image_svg(palette_id: str):
    """Alias da imagem OG do DNA."""
    return await og_dna_image_svg(palette_id)


@router.get("/profile/{handle}/image.svg")
async def og_profile_image_svg(handle: str):
    """Imagem OG (SVG) do perfil. 1200×630. Usa paleta assinatura agregada."""
    h = normalize_handle(handle) or handle.strip().lower()
    summary = await _profile_summary(h) if h else None
    palette = (await _profile_signature_palette(h)) if h else []
    if len(palette) < 3:
        palette = palette + [c for c in _DEFAULT_PALETTE if c.lower() not in palette]
    palette = palette[:6] or list(_DEFAULT_PALETTE)

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

    svg = _build_og_palette_svg(
        eyebrow="LINDART · ARTISTA",
        title_text=f"@{h}",
        title_size=80,
        subtitle=stats_line,
        footer_left="Paleta assinatura",
        colors=palette,
    )
    return _svg_response(svg)


# ─────────────────────────── Trends (AI) OG ───────────────────────────
# As tendências (`/api/ai/trends`) são geradas pela IA e ficam em cache em
# memória dentro de `routers.ai._TRENDS_CACHE`. Aqui expomos um OG endpoint
# que busca a tendência por slug (slugify(name)) dentro do cache e gera os
# metatags + imagem SVG. Se a tendência expirou/não existe, retorna 404 com
# OG mínimo. Humanos são redirecionados para `/trends?paleta={slug}&ref=share`.


def _slugify_trend(name: str) -> str:
    """Slug ASCII kebab a partir do nome da tendência. Reversível o bastante
    para servir como identificador estável durante a vida do cache."""
    import unicodedata

    if not name:
        return ""
    s = unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:80]


def _find_trend_by_id(trend_id: str) -> Optional[dict]:
    """Procura uma tendência no cache em memória de `routers.ai`. Match por
    slug do `name` ou pelo `id` (caso o LLM tenha incluído). Retorna o dict
    da tendência ou None."""
    try:
        from routers.ai import _TRENDS_CACHE  # import lazy p/ evitar ciclo
    except Exception:
        return None
    data = (_TRENDS_CACHE or {}).get("data") or {}
    trends = data.get("trends") or []
    target = (trend_id or "").strip().lower()
    if not target:
        return None
    for t in trends:
        if not isinstance(t, dict):
            continue
        if str(t.get("id") or "").strip().lower() == target:
            return t
        if _slugify_trend(t.get("name") or "") == target:
            return t
    return None


@router.get("/trend/{trend_id}", response_class=HTMLResponse)
async def og_trend_page(trend_id: str, request: Request):
    """Página HTML com Open Graph tags da tendência de cor (Trends IA).
    Crawlers (WhatsApp/IG/X/FB) leem os metatags; humanos são redirecionados
    para `/trends?paleta={trend_id}&ref=share`."""
    origin = _absolute_origin(request)
    redirect_path = f"/trends?paleta={trend_id}&ref=share"

    trend = _find_trend_by_id(trend_id)
    if not trend:
        return _og_404_html(
            title="Paleta de tendência não encontrada",
            description="Essa receita expirou ou ainda não foi gerada nesta sessão.",
            redirect_path="/trends",
            origin=origin,
        )

    name = (trend.get("name") or "Tendência").strip()[:80] or "Tendência"
    tagline = (trend.get("tagline") or "").strip()
    colors = [
        c for c in (trend.get("colors") or [])
        if isinstance(c, str) and _HEX_RE.fullmatch(c.strip())
    ][:6]
    if not colors:
        colors = list(_DEFAULT_PALETTE)

    title = f"{name} · Tendência em resina — LindArt"
    desc_parts: List[str] = []
    if tagline:
        desc_parts.append(tagline)
    if colors:
        desc_parts.append("Paleta: " + " ".join(colors))
    desc_parts.append("Veja a receita completa em epóxi no LindArt.")
    description = " · ".join(desc_parts)[:280]

    redirect_abs = f"{origin}{redirect_path}" if origin else redirect_path
    og_image_abs = (
        f"{origin}/api/og/trend/{trend_id}/image.svg"
        if origin
        else f"/api/og/trend/{trend_id}/image.svg"
    )

    # Reusa o template genérico (dna_og.html) — mesmo layout de paleta.
    template = _jinja_env.get_template("dna_og.html")
    html = template.render(
        signature=name,
        title=title,
        description=description,
        colors=colors,
        redirect_path=redirect_path,
        redirect_abs=redirect_abs,
        og_image_abs=og_image_abs,
        og_alt=f"{name} — Tendência cromática em resina",
    )
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=600, s-maxage=600"},
    )


@router.get("/trend/{trend_id}/image.svg")
async def og_trend_image_svg(trend_id: str):
    """Imagem OG (SVG 1200×630) da tendência. Usa paleta da tendência ou
    fallback default. 404 silencioso — sempre retorna um SVG válido (não
    quebra o preview se cache expirou)."""
    trend = _find_trend_by_id(trend_id) or {}
    name = (trend.get("name") or "Tendência").strip()[:60] or "Tendência"
    tagline = (trend.get("tagline") or "").strip()[:90]
    colors = [
        c for c in (trend.get("colors") or [])
        if isinstance(c, str) and _HEX_RE.fullmatch(c.strip())
    ][:5]
    if not colors:
        colors = list(_DEFAULT_PALETTE)

    svg = _build_og_palette_svg(
        eyebrow="LINDART · TENDÊNCIA",
        title_text=name,
        title_size=72,
        title_y=270,
        subtitle=tagline,
        subtitle_y=330,
        subtitle_size=28,
        footer_left="Receita em resina",
        colors=colors,
    )
    return _svg_response(svg)
