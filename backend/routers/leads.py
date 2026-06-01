"""Lead capture — notificações sobre novas produções 3D.

Endpoint público (sem auth) usado pelo modal "Quero ser notificado" do Studio.
Salva o interesse em `lead_notifications` com deduplicação por email+piece.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from ._shared import db

logger = logging.getLogger("lindart.leads")
router = APIRouter(prefix="/api", tags=["leads"])


VALID_INTERESTS = {
    "anel", "brinco", "colar", "pulseira", "chaveiro",
    "porta-copos", "luminaria", "escultura", "outro", "qualquer",
}


class NotifyMeIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    interest: Optional[str] = Field(default="qualquer", max_length=40)
    message: Optional[str] = Field(default="", max_length=400)


@router.post("/leads/notify-me")
async def notify_me(payload: NotifyMeIn, request: Request):
    """Registra interesse do usuário em ser notificado sobre novas peças.

    Idempotente por (email, interest): se o par já existe, atualiza
    `updated_at` e devolve `already_subscribed=True`.
    """
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="nome obrigatório")

    interest = (payload.interest or "qualquer").strip().lower()
    interest = re.sub(r"[^a-z0-9-]", "", interest) or "qualquer"
    if interest not in VALID_INTERESTS:
        interest = "outro"

    email = payload.email.lower().strip()
    now = datetime.now(timezone.utc)

    existing = await db.lead_notifications.find_one(
        {"email": email, "interest": interest},
        {"_id": 1},
    )
    if existing:
        await db.lead_notifications.update_one(
            {"_id": existing["_id"]},
            {"$set": {"updated_at": now, "name": name, "message": (payload.message or "").strip()[:400]}},
        )
        return {"ok": True, "already_subscribed": True}

    doc = {
        "name": name,
        "email": email,
        "interest": interest,
        "message": (payload.message or "").strip()[:400],
        "source": "studio.coming_soon_modal",
        "user_agent": request.headers.get("user-agent", "")[:240],
        "created_at": now,
        "updated_at": now,
    }
    await db.lead_notifications.insert_one(doc)
    logger.info(f"[leads] novo interesse: {email} → {interest}")
    return {"ok": True, "already_subscribed": False}


async def init_leads():
    try:
        await db.lead_notifications.create_index("email")
        await db.lead_notifications.create_index([("email", 1), ("interest", 1)], unique=False)
        await db.lead_notifications.create_index([("created_at", -1)])
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[leads] index init: {exc}")
