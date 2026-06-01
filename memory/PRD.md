# LindArt — PRD (Premium Studio)

## Original Problem Statement
Plataforma premium para artistas de resina/joalheria/decoração: studio de criação de paleta, tendências curadas por IA, marketplace, comunidade e área de aprendizado.

## Personas
- Artistas independentes de resina/joalheria/decoração
- Estúdios premium buscando inspiração e diferenciação cromática

## Core Areas
- Studio de criação (paleta, mentora IA, DNA visual)
- **Trends** (`/trends`) — tendências cromáticas geradas por IA com receita em resina e compartilhamento social
- Marketplace
- Comunidade (feed)
- Aprender (cursos/podcasts — backend pendente)
- Auth (JWT custom)

## Tech Stack
- Frontend: React (CRA), Tailwind, shadcn/ui, framer-motion, lucide-react, react-hot-toast
- Backend: FastAPI + MongoDB
- LLM: Emergent Universal Key (Claude/GPT)

## Recently Implemented (2026-02)
- ✅ Modal "Como fazer esta cor" com receita dinâmica por classificação cromática (HSL → 10 famílias)
- ✅ "Copiar receita" no footer do modal
- ✅ **Compartilhar receita** — botão `trend-recipe-share` no footer que abre `ShareSheet` com URL `/api/og/trend/{slug}`
- ✅ **Backend OG endpoints**:
  - `GET /api/og/trend/{trend_id}` — HTML com meta tags OG/Twitter, redirect 0s para `/trends?paleta={slug}&ref=share`
  - `GET /api/og/trend/{trend_id}/image.svg` — preview 1200×630 com paleta
  - 404 com OG mínimo quando trend não está no cache
- Helpers: `_slugify_trend`, `_find_trend_by_id` (lazy import de `_TRENDS_CACHE`)

## Backlog / Next
- **P4**: Backend de Podcasts (`GET /api/podcasts`)
- Persistir trends para que share-links sobrevivam à expiração do cache em memória
- Telemetria `?ref=share` em dashboard interno

## Files of Reference
- `/app/frontend/src/pages/Trends.jsx`
- `/app/frontend/src/components/ShareSheet.jsx`
- `/app/backend/routers/og.py`
- `/app/backend/routers/ai.py` (`_TRENDS_CACHE`)
- `/app/backend/server.py` (router registrado)

## Test Endpoints
```bash
# Seed cache
curl -X POST $API_URL/api/ai/trends -H "Content-Type: application/json" -d '{"focus":"geral"}'
# OG page
curl $API_URL/api/og/trend/aurora-mineral
# SVG image
curl $API_URL/api/og/trend/aurora-mineral/image.svg
```
