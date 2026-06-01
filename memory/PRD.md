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
- Home + Studio fixes (Feb 2026 — sessão atual):
  - `MockupShowcase`: cliques nos 3 cards navegam para `/studio` de forma confiável (handler `handleCardClick` com `stopPropagation`, badge "Exemplo" com `pointer-events-none`, suporte a teclado Enter/Space).
  - Mármore CSS aplicado aos cards Home (sem imagens externas) via `MarbleSurface` + multi-camadas `linear/radial/conic-gradient`.
  - `PieceSelectors`: galeria limitada a 3 peças exemplares (`pingente-gota`, `bandeja`, `geodo`). Busca/categorias ocultas. Aviso em dourado itálico: "Mais produções em breve" (`data-testid="piece-coming-soon"`).
  - Adicionado item `geodo` em `PIECES` (`shape: "prism"`, `category: "decorativo"`).
  - `Productions3D.mapPieceTo3DShape`: shapes `prism`/`hex`/`cube` → 3D `geodo` (icosaedro).
- Lead capture + authFetch (Jun 2026 — sessão atual):
  - `backend/routers/leads.py` — `POST /api/leads/notify-me` salva interesse em `lead_notifications` (idempotente por email+interest, índices `email`, `(email,interest)`, `created_at`).
  - `components/NotifyMeModal.jsx` — modal completo (nome, email, interesse, mensagem) acionado pelo clique no texto "Mais produções em breve · me avise" no Studio.
  - Helper `authFetch()` + `authFetchJson()` em `utils/api.js` (Bearer automático, dispara `lindart:auth-expired` em 401).
  - `AuthContext` escuta `lindart:auth-expired` e desloga o usuário automaticamente.
  - Pilotos migrados: `Feed.jsx` (POST /feed) e `Marketplace.jsx` (POST /marketplace) agora usam `authFetch`.
  - Smoke test E2E: modal abre, form submete, lead persistido no Mongo, sucesso visível.
- P0 N1–N5 + UI cleanups + filtros mock + waitlist counter (Iter 43 — Feb 2026):
  - **N1** — `Login.jsx`: link "voltar" → `/` (`data-testid="login-back-home-link"`).
  - **N2** — `Calculator.jsx` (MeasureMode/`box` = L×W×H) e `CalculatorPanel.jsx` (Quadrado) com volume em ml.
  - **N3** — Navbar: removido botão duplicado "Criar paleta".
  - **N4** — `OpeningTour.jsx`: gerencia apenas a chave `lindart.tour.v1.seen` (NUNCA `localStorage.clear()`). Validado preservando keys arbitrárias.
  - **N5** — `Feed.jsx`: fetch silencioso `GET /api/podcasts?limit=3`. Aba "Podcasts" só renderiza se `podcasts.length > 0`; 404/erro = degradação silenciosa.
  - **UI cleanups** — `Feed.jsx` + `Marketplace.jsx`: badges "Exemplo" removidos, filtros/tags em sentence case, dedupe ativo.
  - **Backend filters** — `routers/feed.py`, `routers/marketplace.py`, `routers/challenges.py`: `$nor`+`$regex` para `teste|TEST_|E2E|refactor` em `handle/title/caption/tags` (case-insensitive).
  - **Waitlist counter** — `GET /api/waitlist/count?categoria=fundadoras` (`{ok,categoria,count}`); `FoundersOffer.jsx` faz fallback silencioso para `FALLBACK_SEATS_TAKEN = 97`.
  - Patches emergenciais aplicados pelo testing agent: Feed.jsx fragmento JSX fechado (`</>`), FoundersOffer.jsx `SEATS_TAKEN`→`seatsTaken` (linha 139).
  - testing_agent_v3_fork iter 43: **100% pass** (backend 11/11, frontend 9/9). Report: `/app/test_reports/iteration_43.json`. Pytest: `/app/backend/tests/test_iter43_p0_fixes.py`.
- Validação Fal.ai SVD + Leads + authFetch (Iter 41 — Feb 2026):
  - `svd_video.py`: tratamento de erro melhorado — captura `e.response.text` da `httpx.HTTPStatusError` para detectar `Exhausted balance`/`User is locked` do fal.ai e devolver mensagem PT-BR amigável (`"Saldo da conta fal.ai esgotado. Recarregue em fal.ai/dashboard/billing…"`) com `http_status=402`, em vez de vazar `"Client error '403 Forbidden'"`.
  - `MixerSwirl.jsx`: toast distingue erro de saldo (mostra `detail` direto) de erro genérico (`Falha IA: …`).
  - `FAL_KEY` confirmada válida no `backend/.env`; conta fal.ai atualmente com **saldo esgotado** (locked) — recarga necessária para gerar vídeos reais.
  - testing_agent_v3_fork iter 41: **100% pass** (backend 8/8 pytest, frontend 3/3 E2E playwright). Test file: `/app/backend/tests/test_iter41_leads_svd_feed.py`.

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
- OG Cards para compartilhamento de paletas em redes sociais — ✅ implementado em `routers/og.py`.
- Tracking Analytics/Reach via `?ref=share` — ✅ implementado em `routers/analytics.py` (`POST /api/analytics/hit`, `GET /api/users/me/analytics`).

### P3 / Refactor
- `Calculator.jsx` ainda é o "fat component" canônico das 3 abas. `CalculatorPanel.jsx` foi criado para "Quadrado" (N2) mas duplica parte da lógica de MeasureMode. **Pendente**: refatorar `Calculator.jsx` para virar wrapper fino sobre `CalculatorPanel.jsx`.
- `authFetch()` disponível em `utils/api.js` e adotado em `Feed.jsx` e `Marketplace.jsx` (pilotos). Pendente: migrar demais componentes (`PublicProfile.jsx`, `PublicDNAPage.jsx`, `OnboardingVideo.jsx`, `DNAShareModal.jsx`, `MixerSwirl.jsx`) conforme oportunidade.

### Phase 4 (pós-lançamento)
- Backend `GET /api/podcasts` ainda não implementado (intencional). Frontend já degrada silenciosamente — quando o endpoint existir, basta retornar `[]` ou `[{id,title,cover,audio_url,...}]` e a aba aparece.
- ✅ Integração com Fal.ai Video Generation (SVD) implementada em `routers/svd_video.py`. UI de geração de vídeo a partir do Studio ainda pode receber polimento futuro.

## Health
- Broken: None
- Mocked: None
- Last tested: Feb/2026 — Home polish validado via screenshot + asserts DOM.
