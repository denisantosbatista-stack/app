# LindArt — Studio de Resina Premium (PRD)

## Visão
"Canva/Pinterest da Resina" — SaaS para artistas de resina explorarem paletas, IA criativa, tendências e comunidade.

## Stack
- FastAPI + MongoDB (backend, hot reload via supervisor)
- React 19 + Tailwind + Zustand + Framer Motion (frontend)
- Emergent LLM Key: Claude Sonnet 4.5 (texto), Gemini Nano Banana (imagem), Whisper (STT)
- **Stable Video Diffusion 2.0** via `fal-client` (vídeo) — requer `FAL_KEY` no `.env`

## Persona
Artistas autodidatas de resina (PT-BR), criadoras de paletas e peças, que querem inspiração rápida + ferramentas técnicas (proporção, comparação) + visibilidade.

---

## Roadmap & Status

### ✅ P0 — Core (DONE)
- Mentora IA (chat criativo)
- Tendências da Semana
- Gerador de Coleções
- Mixer / Calculadora de Proporções / Comparador / Biblioteca
- DNA Share (URL pública por paleta)
- Onboarding + Tour de abertura

### ✅ P2 — Comunidade (DONE em 2026-02)
- **Feed Comunitário** (`/feed`) — POST/GET `/api/feed`, like, filtro por tag
- **Pick da Semana** — highlight no Feed (campo `is_pick`)
- **Marketplace Interno** (`/marketplace`) — POST/GET `/api/marketplace`, click tracking
- **Perfil Público de Artista** (`/u/:handle`) — `/api/profile/{handle}` com tabs posts/dnas/marketplace/submissions
- Routing wired em `App.js`, links em `Navbar.jsx` e `MobileNav.jsx`

### ✅ P1 — Virais & Vídeo (DONE em iter 18, 2026-02)
- **OG tags dinâmicas** — `/api/og/dna/{share_id}` retorna HTML com `og:image`, `og:url`, `twitter:image` em **URLs absolutas** (preview no WhatsApp/IG/FB)
- **OG image SVG** — `/api/og/dna/{share_id}/image.svg`
- **Substituição Sora 2 → Stable Video Diffusion 2.0** (Fal.ai)
  - `POST /api/ai/generate-video` (job background)
  - `GET /api/ai/video-status/{job_id}` (polling)
  - Graceful degradation: retorna **HTTP 503** com mensagem clara quando `FAL_KEY` ausente, sem crash
  - UI completa atualizada: `MixerSwirl`, `OnboardingVideo`, `OpeningTour`, `UpgradeInfoModal` — toda menção a "Sora 2" trocada por "SVD 2.0"
- Testing agent iter18: backend 6/6 pytest 100%, frontend smoke 100%, console limpo

### 🟢 P2 — Backlog
- [ ] **Challenge System** (próximo) — temas semanais com submissões da comunidade
- [ ] Auth real (custo: hoje qualquer um pode publicar; rate limit por IP como mitigação)
- [ ] Fluxo E2E real de SVD 2.0 quando usuário fornecer `FAL_KEY`
- [ ] Refactor: extrair `CreatePostModal` e `CreateItemModal` de Feed.jsx/Marketplace.jsx
- [ ] DRY: extrair `Field` duplicado em `/components/ui/Field.jsx`
- [ ] Backend `/api/profile/{handle}` → retornar 404 quando handle não existe em nenhuma coleção
- [ ] Refactor `server.py` (2119 linhas) → extrair `routers/svd_video.py` e `routers/og.py`
- [ ] `_render_dna_og_html` — migrar HTML inline para template Jinja2

---

## Endpoints Principais
- `POST/GET /api/palettes`, `POST /api/dna/share`, `GET /api/dna/{share_id}`
- `GET /api/og/dna/{share_id}` (HTML c/ OG absolutas), `GET /api/og/dna/{share_id}/image.svg`
- `POST/GET /api/feed` (com `is_pick`) + `POST /api/feed/{id}/like`
- `POST/GET /api/marketplace` + `POST /api/marketplace/{id}/click`
- `GET /api/profile/{handle}`, `GET /api/profile`
- `POST /api/mentora/chat`, `POST /api/trends`, `POST /api/collections`
- `POST /api/mixer/image` (Nano Banana)
- `POST /api/ai/generate-video` (SVD 2.0), `GET /api/ai/video-status/{job_id}`

## Modelos (Mongo)
- `palettes`, `dna_shares`, `feed_posts` (com `is_pick: bool`), `marketplace_items`, `profile_submissions`, `video_jobs`

## Health
- Broken: nenhum
- Mocked: nenhum
- SVD 2.0: degrada graciosamente (503) sem `FAL_KEY` — usuário precisa fornecer chave para gerar vídeos reais
- Auth: N/A (app público no MVP)

## Última iteração
**Iter 18 (2026-02)** — Migração Sora 2 → SVD 2.0 + OG tags absolutas + botão "Compartilhar no WhatsApp" no DNA Share Modal (usa URL `/api/og/dna/{id}` para preview com og:image; humanos são redirecionados para `/dna/{id}` via meta refresh). Backend 6/6 e frontend smoke 100%. Sem bugs.
