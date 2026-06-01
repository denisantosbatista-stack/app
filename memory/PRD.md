# PRD — 3D Resin Studio (LindArt)

## Problema original
Aplicação web full-stack (React + FastAPI + MongoDB) — atelê digital para criação,
visualização e exportação de paletas de cores para resina epóxi 3D, com Studio
visual, calculadora de proporções, marketplace e feed comunitário.

## User personas
- **Artista de resina**: cria paletas, calcula proporções, exporta arquivos.
- **Cliente/visitante**: navega tendências, marketplace e inspirações.

## Estado atual (Feb/2026)

### Concluído
- Seed Content (`backend/routers/seed_content.py`) ativo no startup — `feed_posts` & `marketplace_items`.
- Rota canônica da Calculadora: `/calculadora/medidas` → redirect 301 → `/calculadora/medidas-3d`.
- Home polish (Feb 2026):
  - Removida a seção "Ferramentas" do `Home.jsx`.
  - `TrendingPalettes`: reduzido de 6 → 3 paletas em destaque (`slice(0, 3)`).
  - `MockupShowcase`: confirmado em 3 cards (Relógio de Resina, Bandeja Premium, Geodo Decorativo).
  - Espaçamento vertical interno das seções dobrado: `py-12 md:py-20` → `py-24 md:py-32` em `TrendingPalettes` e `MockupShowcase`.

### Arquitetura
- **Frontend**: `/app/frontend/src/`
  - `pages/`: Home, Feed, Marketplace, Studio, Compare, Pricing, Calculator
  - `components/`: Hero, TrendingPalettes, MockupShowcase, ToolsGrid (não usado na Home)
  - `data/palettes.js`: PRESET_PALETTES, MOCKUPS, PALETTE_BACKDROPS
- **Backend**: `/app/backend/`
  - `routers/seed_content.py`
  - APIs: `GET /api/feed`, `GET /api/marketplace`

### Integrações 3rd party
- fal.ai (SVD) — requer chave do usuário (Phase 4, pós-lançamento)
- Claude Sonnet 4.5 / Gemini Nano Banana / OpenAI Whisper — Emergent LLM Key

## Backlog priorizado

### P1
- Nenhum item P1 aberto no momento.

### P2
- OG Cards para compartilhamento de paletas em redes sociais.
- Tracking Analytics/Reach via `?ref=share`.

### P3 / Refactor
- Centralizar chamadas de API via `authFetch()` em todos os componentes do frontend.

### Phase 4 (pós-lançamento)
- Integração com Fal.ai Video Generation (SVD 2.0) — geração de vídeos a partir de paletas.

## Health
- Broken: None
- Mocked: None
- Last tested: Feb/2026 — Home polish validado via screenshot + asserts DOM.
