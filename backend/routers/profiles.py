"""Perfil público do artista — /u/{handle}.

Agrega dados de várias coleções (feed_posts, dna_shares, marketplace_items,
challenge_submissions) para montar uma página de portfólio.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from ._shared import db, normalize_handle

router = APIRouter(prefix="/api/profile", tags=["profiles"])


def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("/{handle}")
async def get_profile(handle: str, limit: int = Query(24, ge=1, le=60)):
    h = normalize_handle(handle)
    if not h:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_handle",
                "message": "Handle inválido. Use apenas letras, números, ponto, hífen ou underline.",
                "handle": handle,
            },
        )

    # Posts do feed
    posts_cursor = (
        db.feed_posts.find({"handle": h}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    posts: List[Dict[str, Any]] = await posts_cursor.to_list(limit)

    # DNA shares deste handle
    dna_cursor = (
        db.dna_shares.find({"handle": h}, {"_id": 0})
        .sort("created_at", -1)
        .limit(6)
    )
    dnas_raw: List[Dict[str, Any]] = await dna_cursor.to_list(6)

    # Itens do marketplace
    market_cursor = (
        db.marketplace_items.find({"handle": h}, {"_id": 0})
        .sort("created_at", -1)
        .limit(12)
    )
    market: List[Dict[str, Any]] = await market_cursor.to_list(12)

    # Submissões em desafios
    subs_cursor = (
        db.challenge_submissions.find({"handle": h}, {"_id": 0})
        .sort("created_at", -1)
        .limit(8)
    )
    submissions: List[Dict[str, Any]] = await subs_cursor.to_list(8)

    # 404 estruturado: handle não tem presença em nenhuma coleção
    if not posts and not dnas_raw and not market and not submissions:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "profile_not_found",
                "message": f"Perfil @{h} ainda não tem peças, DNAs, itens ou submissões publicadas.",
                "handle": h,
            },
        )

    dnas = [
        {
            "id": d.get("id"),
            "signature": (d.get("payload") or {}).get("signature"),
            "dominant_colors": (d.get("payload") or {}).get("dominant_colors", [])[:6],
            "mood": (d.get("payload") or {}).get("mood", [])[:6],
            "created_at": d.get("created_at"),
            "path": f"/dna/{d.get('id')}",
        }
        for d in dnas_raw
    ]

    # Agrega cores dominantes mais usadas (top 8) para "paleta assinatura"
    color_counts: Dict[str, int] = {}
    for p in posts:
        for c in p.get("palette_colors", []) or []:
            if isinstance(c, str) and c.startswith("#"):
                color_counts[c.upper()] = color_counts.get(c.upper(), 0) + 1
    for d in dnas_raw:
        for c in (d.get("payload") or {}).get("dominant_colors", []) or []:
            if isinstance(c, str) and c.startswith("#"):
                color_counts[c.upper()] = color_counts.get(c.upper(), 0) + 2  # peso maior
    signature_palette = [
        c for c, _ in sorted(color_counts.items(), key=lambda kv: -kv[1])[:8]
    ]

    total_likes = sum(int(p.get("likes", 0) or 0) for p in posts)

    return {
        "handle": h,
        "stats": {
            "posts": len(posts),
            "dnas": len(dnas),
            "marketplace_items": len(market),
            "challenges": len(submissions),
            "total_likes": total_likes,
        },
        "signature_palette": signature_palette,
        "posts": [_clean(p) for p in posts],
        "dnas": dnas,
        "marketplace": [_clean(m) for m in market],
        "submissions": [_clean(s) for s in submissions],
    }


@router.get("")
async def list_handles(limit: int = Query(40, ge=1, le=80)):
    """Lista handles ativos (com pelo menos 1 post no feed)."""
    pipeline = [
        {"$group": {
            "_id": "$handle",
            "posts": {"$sum": 1},
            "likes": {"$sum": "$likes"},
            "last": {"$max": "$created_at"},
        }},
        {"$sort": {"likes": -1, "posts": -1}},
        {"$limit": limit},
    ]
    rows = await db.feed_posts.aggregate(pipeline).to_list(limit)
    return [
        {
            "handle": r["_id"],
            "posts": r["posts"],
            "likes": r.get("likes", 0),
            "last_post_at": r.get("last"),
        }
        for r in rows if r.get("_id")
    ]
