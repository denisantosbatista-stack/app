# LindArt — PRD

## Problema original
Studio premium de resina para artesãs gerarem paletas, coleções e mockups com IA, com perfil público compartilhável.

## Tarefas em andamento / pendentes

### ✅ P0 (concluído nesta sessão) — Padronização "Mentora → Mentoria" + Acessibilidade botão Anexar
Página `/mentora` (`/app/frontend/src/pages/Mentora.jsx`):
- Botão **Anexar foto** agora respeita WCAG 2.5.5: área clicável `min-h-[44px] min-w-[44px]`, ícone `w-6 h-6` (24px), label visível "Anexar foto", `aria-label` adicional
Padronização de grafia em todos os textos visíveis (URL `/mentora` e testIDs preservados para não quebrar backend/testes):
- `frontend/src/components/Navbar.jsx` (dropdown Aprender): "Mentora" → "Mentoria"
- `frontend/src/components/pricing/PricingBeforeAfter.jsx`: "Sem Mentora IA" → "Sem Mentoria IA"
- `frontend/src/data/pricingComparison.js`: "Mentora IA (mensagens/mês)" → "Mentoria IA …"
- `frontend/src/data/pricingPlans.js` (2 ocorrências): "Mentora IA" → "Mentoria IA"
- `frontend/src/components/onboarding/SegmentStep.jsx`: "Atelier" → "Ateliê" (padrão PT-BR)

### ✅ P0 (concluído anteriormente) — Bug: botão "Gerar Coleção"
Arquivo: `/app/frontend/src/pages/Collections.jsx`
- `onClick={generate}` agora dispara mesmo com campos vazios (validação exibida ao usuário)
- Validação inline + toast quando `theme` está vazio
- Loading state com spinner + texto "Gerando sua coleção..." (com tentativa N/3)
- Retry automático 3x com delay de 1.5s para HTTP 503

### 🟡 P0 (em backlog, iniciado parcialmente) — Seed Content & Reformulação Pricing
- Seed Content: arquivo `/app/backend/routers/seed_content.py` criado mas não plugado no `lifespan` do `server.py`; badge "EXEMPLO" no Marketplace pendente.
- Pricing: reformulação visual completa (toggle, card Fundadoras 100/100 mockado, card Studio, tabela comparativa).

### 🔄 P2 — Analytics / Reach Tracking (retomar)
- `POST /api/analytics/hit` (PUBLIC, filtra User-Agent bots) em `/app/backend/routers/analytics.py`
- `GET /api/users/me/analytics` (SECURE)
- Listener global em `App.js` para `?ref=share` com deduplicação via `sessionStorage`
- Aba "Alcance" em `PublicProfile.jsx` com Sparkline em SVG puro
- Schema Mongo: `analytics_clicks`
- Testar com `testing_agent_v3_fork` ao final (frontend + backend)

### 🔜 P2 (Fase 2) — Chip "v{n}"
- Chip dourado clicável na paleta ativa do Studio que abre o modal de versionamento

### 🧹 P3 — Refatoração DRY
- `/app/backend/routers/og.py` (~linha 643): refatorar `og_profile_image_svg` para usar `_build_og_palette_svg(extras_svg=stats_line)`
- Centralizar `authFetch()` no frontend
- Extrair `<VerifiedAuthorChip>`
- Redirecionar erro 401 para `/login` dentro dos modais

## Integrações 3rd party
- fal.ai (Stable Video Diffusion 2.0) — API Key do usuário
- Claude Sonnet 4.5 — Emergent LLM Key
- Gemini Nano Banana — Emergent LLM Key
- OpenAI Whisper — Emergent LLM Key

## Health check
- ✅ Backend, frontend e Mongo rodando
- ✅ Collections "Gerar Coleção" agora dispara, valida, mostra loading correto e retry 3x em 503
