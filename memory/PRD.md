# PRD — LindArt Studio Premium (Resin Studio)

## Problema original
Studio visual para resineiras: paletas, calculadora de proporções, comparador (A vs B), IA mentora, feed/marketplace/desafios, planos pagos. Stack: React (frontend) + FastAPI (backend) + MongoDB.

## Status atual (Fev 2026)

### ✅ Implementado / Estável
- Visualizador 2D de resina (ResinVisualizer) — paletas claras corrigidas (sem blob branco).
- ResinVisualizer canvas 2D com blend modes corretos.
- Navbar com bloco condicional único `!isAuthenticated ? (Entrar+Cadastrar) : (Avatar+Menu)`.
- Cor `bone` adicionada ao tailwind (`#F4EFE6` / `bone-warm #EFE6D4`) — corrige botão "Cadastrar" que renderizava preto.
- Dropdown "Minha conta" filtra itens por `authRequired` — para não autenticados mostra apenas "Ver planos" e "Privacidade".
- Rotas `/compare` e `/collections` protegidas por `RequireAuth` com toast `react-hot-toast` "Faça login para acessar" e redirect `/login?next=...`.
- CompareView3D existe mas testes automatizados ainda travam por causa do canvas 3D.

### 🔴 P0 — Pendente (recorrente)
1. **Seed Content** (`/app/backend/routers/seed_content.py` vazio): 3 posts Feed + 2 itens Marketplace + badge "EXEMPLO" no Marketplace.jsx. Chamar no `lifespan` do `server.py`.
2. **Reformulação `/pricing`**: toggle mensal/anual, card "Fundadoras" destacado, tabela comparativa. Editar `pricingPlans.js` + `Pricing.jsx`.

### 🟡 P1
- Testes automatizados do Compare.jsx travando por causa do canvas Three.js (timeout 30s).

### 🟢 P2/P3 — Backlog
- Analytics `?ref=share` tracking.
- Chip "v{n}" nas paletas do Studio.
- Aplicar `RequireAuth` em `/studio`, `/calculator`, `/mixer` (decisão de produto).
- Refatorar `Navbar.jsx` (470 linhas → quebrar em subcomponentes).
- Centralizar `authFetch()`.

## Integrações 3rd-party
- fal.ai (Stable Video Diffusion 2.0) — chave do usuário.
- Claude Sonnet 4.5 / Gemini Nano Banana / OpenAI Whisper — Emergent LLM Key.

## Arquivos chave
- `/app/frontend/src/components/Navbar.jsx` (470 linhas — candidato a refactor)
- `/app/frontend/src/components/RequireAuth.jsx`
- `/app/frontend/src/contexts/AuthContext.jsx`
- `/app/frontend/tailwind.config.js`
- `/app/frontend/src/App.js`
- `/app/backend/routers/seed_content.py` (vazio)

## Modelo de dados (Mongo)
- `feed_posts`: `{ author_id, content, image, likes }`
- `marketplace_items`: `{ title, price, tags, author_id }`

## Endpoints relevantes
- `GET /api/auth/me`, `GET /api/feed`, `GET /api/marketplace`
