"""Seed automático de conteúdo de exemplo (Feed + Marketplace).

Executado uma única vez no startup do app (via lifespan em server.py).
Só insere conteúdo quando as coleções estão vazias — totalmente idempotente.

Critério para não duplicar:
- feed_posts: insere 3 posts se a coleção estiver vazia.
- marketplace_items: insere 2 itens se a coleção estiver vazia.

Toda a curadoria é feita pela conta oficial `@lindart` (verified=True).
Itens do marketplace carregam a tag "exemplo" para o front renderizar o badge.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from ._shared import db

logger = logging.getLogger(__name__)

OFFICIAL_HANDLE = "lindart"

# ---------- FEED (3 posts) ----------

_SEED_FEED_POSTS = [
    {
        "title": "Ouro Líquido em movimento",
        "description": (
            "Quando o pigmento dourado encontra a resina cristalina, o resultado "
            "é movimento congelado. Essa peça nasceu de 14 camadas finas e três "
            "noites de cura."
        ),
        "image_url": "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=1200&q=80&auto=format&fit=crop",
        "palette_colors": ["#0B0B0B", "#1A1714", "#3A2F1E", "#8C6A2D", "#D4B260", "#F4E4B8"],
        "tags": ["ouro", "abstrata", "premium"],
        "likes": 47,
    },
    {
        "title": "Oceano Mineral — estudo em azul profundo",
        "description": (
            "Inspirada nas manhãs frias da costa, essa série explora a tensão "
            "entre a calma do azul-petróleo e os flashes de espuma perolada. "
            "Resina alta densidade com inclusão de mica natural."
        ),
        "image_url": "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=1200&q=80&auto=format&fit=crop",
        "palette_colors": ["#08111A", "#1A2E44", "#3E5E78", "#7DA4C2", "#C9D9E5"],
        "tags": ["oceano", "azul", "minimalista"],
        "likes": 33,
    },
    {
        "title": "Geode dourada — bandeja autoral",
        "description": (
            "Bandeja redonda de 28cm com efeito geodo. A paleta foi gerada pela "
            "Mentora IA do LindArt a partir de uma foto de quartzo citrino — "
            "transferida pra resina em 6 horas de trabalho."
        ),
        "image_url": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1200&q=80&auto=format&fit=crop",
        "palette_colors": ["#1C1109", "#4A2E14", "#8C6A2D", "#D4B260", "#EFD9A0", "#FFFFFF"],
        "tags": ["geodo", "bandeja", "ouro"],
        "likes": 62,
    },
]


# ---------- MARKETPLACE (2 itens — molde + ebook) ----------

_SEED_MARKETPLACE_ITEMS = [
    {
        "type": "molde",
        "title": "Molde Bandeja Geodo 28cm — Edição LindArt",
        "description": (
            "Molde de silicone platinum food-safe para bandeja circular de 28cm "
            "com borda recortada estilo geodo. Inclui guia PDF de proporção de "
            "resina e pigmento dourado."
        ),
        "image_url": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80&auto=format&fit=crop",
        "price_brl": 189.0,
        "link": "https://lindart.app/exemplo/molde-geodo",
        "tags": ["exemplo", "molde", "geodo"],
    },
    {
        "type": "ebook",
        "title": "E-book: Precificação Justa para Artistas de Resina",
        "description": (
            "Guia completo (48 páginas) com planilha de custos, fórmula de "
            "margem, scripts de venda no Instagram e estudos de caso reais de "
            "artistas que tiraram o ateliê do prejuízo."
        ),
        "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1200&q=80&auto=format&fit=crop",
        "price_brl": 47.0,
        "link": "https://lindart.app/exemplo/ebook-precificacao",
        "tags": ["exemplo", "negocios", "precificacao"],
    },
]


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _seed_feed_if_empty() -> int:
    count = await db.feed_posts.count_documents({})
    if count > 0:
        return 0
    now = _iso_now()
    docs = []
    for p in _SEED_FEED_POSTS:
        docs.append({
            "id": uuid.uuid4().hex[:12],
            "handle": OFFICIAL_HANDLE,
            "title": p["title"],
            "description": p["description"],
            "image_url": p["image_url"],
            "palette_colors": p["palette_colors"],
            "tags": p["tags"],
            "likes": p["likes"],
            "verified": True,
            "created_at": now,
        })
    if docs:
        await db.feed_posts.insert_many(docs)
    return len(docs)


async def _seed_marketplace_if_empty() -> int:
    count = await db.marketplace_items.count_documents({})
    if count > 0:
        return 0
    now = _iso_now()
    docs = []
    for it in _SEED_MARKETPLACE_ITEMS:
        docs.append({
            "id": uuid.uuid4().hex[:12],
            "type": it["type"],
            "title": it["title"],
            "description": it["description"],
            "image_url": it["image_url"],
            "price_brl": it["price_brl"],
            "currency": "BRL",
            "link": it["link"],
            "handle": OFFICIAL_HANDLE,
            "verified": True,
            "tags": it["tags"],
            "clicks": 0,
            "created_at": now,
        })
    if docs:
        await db.marketplace_items.insert_many(docs)
    return len(docs)


async def ensure_seed_content() -> None:
    """Garante que Feed e Marketplace tenham conteúdo de exemplo no primeiro boot."""
    try:
        feed_inserted = await _seed_feed_if_empty()
        market_inserted = await _seed_marketplace_if_empty()
        if feed_inserted or market_inserted:
            logger.info(
                "seed_content: feed=%s post(s), marketplace=%s item(s) inseridos",
                feed_inserted,
                market_inserted,
            )
    except Exception as exc:  # noqa: BLE001
        # Nunca quebrar o startup por causa do seed.
        logger.warning("seed_content: falha ao inserir conteúdo de exemplo: %s", exc)
