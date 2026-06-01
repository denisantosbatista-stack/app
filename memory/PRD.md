# PRD — LindArt Studio Premium (Resin Studio)

## Problema original
Studio visual para resineiras: paletas, calculadora de proporções, comparador (A vs B), IA mentora, feed/marketplace/desafios, planos pagos. Stack: React (frontend) + FastAPI (backend) + MongoDB.

## Status atual (Fev 2026)

### ✅ Sprint P1 — Polish UX/UI (Fev 2026) — CONCLUÍDO
- **Home CTA**: "✦ Criar minha primeira paleta" validado em `Hero.jsx`.
- **Pricing (`/planos`)**: três tiers `Essencial R$47 / Pro R$97 / Studio R$197` em `pricingPlans.js`; badge "PREÇO DE LANÇAMENTO" em `Pricing.jsx`; contador "97 de 100 vagas" em `FoundersOffer.jsx`.
- **Calculadora (`/calculadora`)**: sub-rotas (lucro, precificação, medidas) navegam sem 404 nem console errors.
- **Compare 3D (`/compare`) — Bug fix crítico**: o plugin Babel `visual-edits` do Emergent injetava atributos `x-line-number` / `x-file-name` em todo elemento JSX. Wrappers do `@react-three/drei` (`Environment`, `OrbitControls`, `ContactShadows`) repassavam essas props para intrínsecos R3F via `<primitive>`, disparando `R3F: Cannot set "x-line-number"` em `applyProps`. **Fix**: TODOS os filhos do `<Canvas>` em `CompareView3D.jsx` agora são criados via `React.createElement(h, ...)` em vez de JSX. Antes: 8 pageerrors. Depois: 0 erros (validado por `testing_agent_v3_fork` iter 40, 100% green). Adicionado comment block alertando contribuidores a NÃO usar JSX dentro do `<Canvas>`.
- **Validação automatizada**: `iteration_40.json` reporta 6/6 critérios de aceitação OK; nav regression Home→Compare→Pricing→Calculadora com 0 erros.

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

### 🟡 P1
- (nenhum item ativo — sprint P1 de Fev 2026 fechado).

### 🟢 P2/P3 — Backlog
- OG Cards para compartilhamento de paletas (pós-launch).
- Analytics `?ref=share` tracking.
- Chip "v{n}" nas paletas do Studio.
- Aplicar `RequireAuth` em `/studio`, `/calculator`, `/mixer` (decisão de produto).
- Refatorar `Navbar.jsx` (470 linhas → quebrar em subcomponentes).
- Centralizar `authFetch()`.
- Fase 4: integração Fal.ai (Stable Video Diffusion 2.0) — pós-launch.
- Considerar ESLint rule para impedir uso de JSX dentro de `<Canvas>` do R3F (prevenir regressão do bug do plugin `visual-edits`).
- Pricing badge: texto-fonte é "Preço de lançamento" exibido em uppercase via Tailwind — se SSR/SEO importar, padronizar a string-fonte para "PREÇO DE LANÇAMENTO".
- Calculadora: `/calculadora/medidas` e `/calculadora/medidas-3d` ambos resolvem — definir URL canônica e redirecionar a outra.

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
