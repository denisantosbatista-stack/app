"""Sistema de Desafios — competições temáticas da comunidade LindArt.

Modelo simples e anônimo (igual Feed/Marketplace): cada artista submete sua peça
usando um handle livre, e a comunidade vota anonimamente.

Endpoints:
- GET  /api/challenges                                       lista todos
- GET  /api/challenges/{id}                                  detalhe + submissões
- POST /api/challenges/{id}/submissions                      enviar submissão
- POST /api/challenges/{id}/submissions/{sub_id}/vote        votar (anônimo)

Auto-seed: na primeira listagem, se a coleção `challenges` estiver vazia, inserimos
dois desafios "vitrine" para que a página nunca apareça vazia.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ._shared import db, normalize_handle, save_base64_image
from .auth import get_current_user

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


# Filtro anti-mock — exclui submissões/desafios de teste/seed das listagens públicas
MOCK_EXCLUDE_FILTER: dict = {
    "$nor": [
        {"handle": {"$regex": "teste", "$options": "i"}},
        {"handle": {"$regex": "^test_", "$options": "i"}},
        {"handle": {"$regex": "^e2e", "$options": "i"}},
        {"title": {"$regex": "^TEST_"}},
        {"title": {"$regex": "^E2E"}},
        {"title": {"$regex": "^refactor", "$options": "i"}},
        {"caption": {"$regex": "^TEST_"}},
        {"caption": {"$regex": "^E2E"}},
    ]
}


# ---------- MODELS ----------

class Challenge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    title: str
    prompt: str
    theme_color: str = "#D4B260"  # gold default
    palette_hint: List[str] = Field(default_factory=list)
    cover_image_url: Optional[str] = None
    starts_at: str
    ends_at: str
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class ChallengeOut(Challenge):
    # Campos computados na resposta — não existem no documento Mongo.
    status: str = "active"
    submissions_count: int = 0


class ChallengeSubmission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    challenge_id: str
    handle: str
    caption: Optional[str] = ""
    image_url: str
    palette_colors: List[str] = Field(default_factory=list)
    votes: int = 0
    verified: bool = False
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class SubmissionCreate(BaseModel):
    caption: Optional[str] = ""
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    palette_colors: List[str] = Field(default_factory=list)


class ChallengeDetail(BaseModel):
    challenge: ChallengeOut
    submissions: List[ChallengeSubmission]
    winner: Optional[ChallengeSubmission] = None


# ---------- SEED ----------

_SEED_CHALLENGES = [
    {
        "title": "Ouro Líquido",
        "prompt": (
            "Crie uma peça em resina inspirada no movimento do ouro líquido. "
            "Foco em texturas que sugerem profundidade, brilho metálico e sensação "
            "de luxo silencioso. Sem cores frias."
        ),
        "theme_color": "#D4B260",
        "palette_hint": ["#0B0B0B", "#1A1714", "#3A2F1E", "#8C6A2D", "#D4B260", "#F4E4B8"],
        "cover_image_url": None,
        "duration_days": 14,
        "starts_offset_days": 0,
    },
    {
        "title": "Oceano Mineral",
        "prompt": (
            "Resina com vibe de praia rara — geodos, cristais salinos, espuma e areia "
            "preta. Capture aquela sensação de manhã fria à beira-mar. Aposte em "
            "azuis profundos e cinzas perolados."
        ),
        "theme_color": "#3E5E78",
        "palette_hint": ["#08111A", "#1A2E44", "#3E5E78", "#7DA4C2", "#C9D9E5", "#F5F1EA"],
        "cover_image_url": None,
        "duration_days": 21,
        "starts_offset_days": -3,
    },
]


async def _ensure_seed():
    count = await db.challenges.count_documents({})
    if count > 0:
        return
    now = datetime.now(timezone.utc)
    docs = []
    for s in _SEED_CHALLENGES:
        starts = now + timedelta(days=s["starts_offset_days"])
        ends = starts + timedelta(days=s["duration_days"])
        ch = Challenge(
            title=s["title"],
            prompt=s["prompt"],
            theme_color=s["theme_color"],
            palette_hint=s["palette_hint"],
            cover_image_url=s["cover_image_url"],
            starts_at=starts.isoformat(),
            ends_at=ends.isoformat(),
        )
        docs.append(ch.model_dump())
    if docs:
        await db.challenges.insert_many(docs)


def _status_for(starts_at: str, ends_at: str) -> str:
    now = datetime.now(timezone.utc).isoformat()
    if now < starts_at:
        return "upcoming"
    if now > ends_at:
        return "ended"
    return "active"


# ---------- ROUTES ----------

@router.get("", response_model=List[ChallengeOut])
async def list_challenges(
    limit: int = Query(30, ge=1, le=60),
):
    await _ensure_seed()
    cursor = (
        db.challenges.find({**MOCK_EXCLUDE_FILTER}, {"_id": 0})
        .sort("starts_at", -1)
        .limit(limit)
    )
    docs = await cursor.to_list(limit)
    out: List[ChallengeOut] = []
    for d in docs:
        sub_count = await db.challenge_submissions.count_documents(
            {**MOCK_EXCLUDE_FILTER, "challenge_id": d["id"]}
        )
        status = _status_for(d["starts_at"], d["ends_at"])
        out.append(
            ChallengeOut(
                **d,
                status=status,
                submissions_count=sub_count,
            )
        )
    # ordenar: active primeiro, depois upcoming, depois ended
    order = {"active": 0, "upcoming": 1, "ended": 2}
    out.sort(key=lambda c: (order.get(c.status, 3), c.starts_at), reverse=False)
    return out


@router.get("/{challenge_id}", response_model=ChallengeDetail)
async def get_challenge(challenge_id: str):
    doc = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Desafio não encontrado")

    sub_cursor = (
        db.challenge_submissions.find(
            {**MOCK_EXCLUDE_FILTER, "challenge_id": challenge_id}, {"_id": 0}
        )
        .sort([("votes", -1), ("created_at", -1)])
        .limit(200)
    )
    sub_docs = await sub_cursor.to_list(200)
    submissions = [ChallengeSubmission(**s) for s in sub_docs]
    sub_count = len(submissions)
    status = _status_for(doc["starts_at"], doc["ends_at"])
    winner = submissions[0] if (status == "ended" and submissions) else None

    challenge = ChallengeOut(**doc, status=status, submissions_count=sub_count)
    return ChallengeDetail(
        challenge=challenge,
        submissions=submissions,
        winner=winner,
    )


@router.post("/{challenge_id}/submissions", response_model=ChallengeSubmission)
async def create_submission(
    challenge_id: str,
    req: SubmissionCreate,
    user: dict = Depends(get_current_user),
):
    ch = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not ch:
        raise HTTPException(status_code=404, detail="Desafio não encontrado")

    status = _status_for(ch["starts_at"], ch["ends_at"])
    if status == "ended":
        raise HTTPException(status_code=400, detail="Este desafio já foi encerrado")
    if status == "upcoming":
        raise HTTPException(status_code=400, detail="Este desafio ainda não começou")

    h = normalize_handle(user.get("handle") or "")
    if not h:
        raise HTTPException(status_code=400, detail="Sua conta não possui handle configurado")

    if req.image_base64:
        try:
            image_url = save_base64_image(req.image_base64, "challenges")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    elif req.image_url:
        image_url = req.image_url.strip()
    else:
        raise HTTPException(
            status_code=400, detail="image_base64 ou image_url obrigatório"
        )

    colors = [
        c
        for c in (req.palette_colors or [])
        if isinstance(c, str) and c.startswith("#")
    ][:8]

    sub = ChallengeSubmission(
        challenge_id=challenge_id,
        handle=h,
        caption=(req.caption or "").strip()[:280],
        image_url=image_url,
        palette_colors=colors,
        verified=True,
    )
    await db.challenge_submissions.insert_one(sub.model_dump())
    return sub


@router.post("/{challenge_id}/submissions/{sub_id}/vote")
async def vote_submission(challenge_id: str, sub_id: str):
    ch = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not ch:
        raise HTTPException(status_code=404, detail="Desafio não encontrado")
    status = _status_for(ch["starts_at"], ch["ends_at"])
    if status != "active":
        raise HTTPException(
            status_code=400, detail="Votação fechada — desafio não está ativo"
        )
    result = await db.challenge_submissions.find_one_and_update(
        {"id": sub_id, "challenge_id": challenge_id},
        {"$inc": {"votes": 1}},
        projection={"_id": 0, "id": 1, "votes": 1},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Submissão não encontrada")
    return {"id": result["id"], "votes": result["votes"]}
