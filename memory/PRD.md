# PRD — LindArt Studio Premium (Resin Studio)

## Problema original
Studio visual para resineiras: paletas, calculadora de proporções, comparador (A vs B), IA mentora, feed/marketplace/desafios, planos pagos. Stack: React (frontend) + FastAPI (backend) + MongoDB.

## Status atual (Fev 2026)

### ✅ Implementado / Estável
- **Backdrops atmosféricos das Paletas Trending (Fev 2026)**: removidas URLs externas do Unsplash que retornavam imagens não-relacionadas (profissional de laboratório, óculos, paisagens). `PALETTE_BACKDROPS` em `/app/frontend/src/data/palettes.js` gera gradientes radiais derivados das próprias cores da paleta + textura cristalina via `repeating-linear-gradient`. Coerência cromática 100% garantida.
- **Badge "EXEMPLO" em conteúdo seed (Fev 2026)**: dourado semi-transparente `rgba(212,175,55,0.85)`, texto branco, canto superior-esquerdo. Aplicado em `TrendingPalettes.jsx` (6 cards) e `MockupShowcase.jsx` (3 cards). data-testid: `exemplo-badge-{id}` e `mockup-exemplo-badge-{id}`.
- Visualizador 2D de resina (ResinVisualizer) — paletas claras corrigidas (sem blob branco).
- ResinVisualizer canvas 2D com blend modes corretos.
- Navbar com bloco condicional único `!isAuthenticated ? (Entrar+Cadastrar) : (Avatar+Menu)`.
- Cor `bone` adicionada ao tailwind (`#F4EFE6` / `bone-warm #EFE6D4`) — corrige botão "Cadastrar" que renderizava preto.
- Dropdown "Minha conta" filtra itens por `authRequired` — para não autenticados mostra apenas "Ver planos" e "Privacidade".
- Rotas `/compare` e `/collections` protegidas por `RequireAuth` com toast `react-hot-toast` "Faça login para acessar" e redirect `/login?next=...`.
- CompareView3D existe mas testes automatizados ainda travam por causa do canvas 3D.
- **Studio "Tipo de peça" reestruturado (Fev 2026)**: categoria `Mesa & Casa` removida; itens (Bandeja, Porta-copo, Sousplat, Luminária, Folha, Pena, Coração, Prisma, Cubo, Vaso, Castiçal, Tigela, Porta-joias, Cachepô) migrados para `Decorativo`; nova categoria `Objetos Escolares` (Caderno, Caderneta, Caneta, Régua, Marcador, Chaveiro — Marcador/Chaveiro só aqui). Thumbnails 48×48px com nome embaixo. Arquivos: `/app/frontend/src/data/palettes.js`, `/app/frontend/src/components/PieceSelectors.jsx`, `/app/frontend/src/components/PieceShape.jsx`.
- **Galeria 3D dinâmica (Productions3D)**: tabs fixas Geodo/Bandeja/Colar removidas; o viewer mapeia automaticamente a peça selecionada na biblioteca para a melhor das 3 formas 3D (geodo/bandeja/colar) via `mapPieceTo3DShape()`; badge no canto exibe a peça ativa.

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
