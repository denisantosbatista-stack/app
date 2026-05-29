from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="LindArt API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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


# ===== Models =====
class ColorSwatch(BaseModel):
    hex: str
    name: str
    role: str  # principal | acento | detalhe | veios


class Palette(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    colors: List[ColorSwatch]
    style: Optional[str] = "classic"
    tags: List[str] = []
    favorite: bool = False
    source: str = "user"  # user | ai | preset
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PaletteCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    colors: List[ColorSwatch]
    style: Optional[str] = "classic"
    tags: List[str] = []
    favorite: bool = False
    source: str = "user"


class PaletteUpdate(BaseModel):
    name: Optional[str] = None
    favorite: Optional[bool] = None
    tags: Optional[List[str]] = None


class AIPromptRequest(BaseModel):
    prompt: str
    style: Optional[str] = None


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "LindArt API online", "version": "1.0"}


@api_router.post("/ai/generate-palette", response_model=Palette)
async def generate_palette_ai(req: AIPromptRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    system_msg = (
        "Você é uma especialista em cromática e design de joias de resina epóxi de luxo. "
        "Dado um prompt do usuário (em português ou inglês), retorne EXCLUSIVAMENTE um JSON válido "
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

    user_text = f"Prompt: {req.prompt}"
    if req.style:
        user_text += f"\nEstilo preferido: {req.style}"

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"palette-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        response = await chat.send_message(UserMessage(text=user_text))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI error: {e!r}")
        raise _map_llm_exception(e)

    # Extract JSON from response
    raw = response.strip()
    # Remove markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise HTTPException(status_code=502, detail="AI returned invalid format")

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {e}")

    # Build Palette
    palette = Palette(
        name=data.get("name", "Paleta IA"),
        description=data.get("description", ""),
        colors=[ColorSwatch(**c) for c in data.get("colors", [])],
        style=data.get("style", "luxo"),
        tags=data.get("tags", []),
        source="ai",
    )
    return palette


@api_router.get("/palettes", response_model=List[Palette])
async def list_palettes(favorite: Optional[bool] = None):
    query = {}
    if favorite is not None:
        query["favorite"] = favorite
    docs = await db.palettes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Palette(**d) for d in docs]


@api_router.post("/palettes", response_model=Palette)
async def save_palette(p: PaletteCreate):
    palette = Palette(**p.model_dump())
    await db.palettes.insert_one(palette.model_dump())
    return palette


@api_router.patch("/palettes/{palette_id}", response_model=Palette)
async def update_palette(palette_id: str, update: PaletteUpdate):
    upd = {k: v for k, v in update.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.palettes.find_one_and_update(
        {"id": palette_id}, {"$set": upd}, return_document=True, projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Palette not found")
    return Palette(**result)


@api_router.delete("/palettes/{palette_id}")
async def delete_palette(palette_id: str):
    result = await db.palettes.delete_one({"id": palette_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Palette not found")
    return {"deleted": True, "id": palette_id}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
