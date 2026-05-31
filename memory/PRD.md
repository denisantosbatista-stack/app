# LindArt — PRD

## Problema original
Studio premium de resina para artesãs gerarem paletas, coleções e mockups com IA, com perfil público compartilhável.

## Tarefas em andamento / pendentes

### ✅ P0 (concluído nesta sessão) — Bug: botão "Gerar Coleção"
Arquivo: `/app/frontend/src/pages/Collections.jsx`
- `onClick={generate}` agora dispara mesmo com campos vazios (validação exibida ao usuário)
- Validação inline + toast quando `theme` está vazio (`data-testid="collection-theme-error"`)
- Loading state com spinner `Loader2` + texto exato "Gerando sua coleção..." (mostra "(tentativa N/3)" durante retries)
- Retry automático 3x com delay de 1.5s para HTTP 503 na chamada `POST /api/ai/collection`

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
