# LindArt — Studio de Resina Premium (PRD)

## Visão
"Canva/Pinterest da Resina" — SaaS para artistas de resina explorarem paletas, IA criativa, tendências e comunidade.

## Stack
- FastAPI + MongoDB (backend, hot reload via supervisor)
- React 19 + Tailwind + Zustand + Framer Motion (frontend)
- Emergent LLM Key: Claude Sonnet 4.5 (texto), Gemini Nano Banana (imagem), Whisper (STT), Sora 2 (vídeo)

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
- **Marketplace Interno** (`/marketplace`) — POST/GET `/api/marketplace`, click tracking
- **Perfil Público de Artista** (`/u/:handle`) — `/api/profile/{handle}` com tabs posts/dnas/marketplace/submissions
- Routing wired em `App.js`, links em `Navbar.jsx` (desktop) e `MobileNav.jsx` (mobile)
- Testing agent: 100% (backend 5/5 pytest, frontend smoke OK)

### 🟡 P1 — Próximos
- [ ] Onboarding com vídeo instrucional curto
- [ ] Conectar **Sora 2** ao `MixerSwirl.jsx` para reels virais (com fallback se API hang)
- [ ] OG tags dinâmicas para DNA público (preview em redes sociais)

### 🟢 P2 — Backlog
- [ ] Sistema de Desafios (Challenges) — temas semanais com submissões
- [ ] Auth real (custo: hoje qualquer um pode publicar; rate limit por IP como mitigação)
- [ ] Refactor: extrair `CreatePostModal` e `CreateItemModal` de Feed.jsx/Marketplace.jsx
- [ ] DRY: extrair `Field` duplicado em `/components/ui/Field.jsx`
- [ ] Backend `/api/profile/{handle}` → retornar 404 quando handle não existe em nenhuma coleção (hoje devolve stats zerados)

---

## Endpoints Principais
- `POST/GET /api/palettes`, `POST/GET /api/dna-share`, `GET /dna/{share_id}`
- `POST/GET /api/feed` + `POST /api/feed/{id}/like`
- `POST/GET /api/marketplace` + `POST /api/marketplace/{id}/click`
- `GET /api/profile/{handle}`, `GET /api/profile`
- `POST /api/mentora/chat`, `POST /api/trends`, `POST /api/collections`
- `POST /api/mixer/image` (Nano Banana), `POST /api/mixer/swirl` (Sora 2 — pode hang)

## Modelos (Mongo)
- `palettes`, `dna_shares`, `feed_posts`, `marketplace_items`, `profile_submissions`

## Health
- Broken: Sora 2 (responsividade externa instável)
- Mocked: nenhum
- Auth: N/A (app público no MVP)

## Última iteração
**Iter 17 (2026-02)** — Wiring P2 frontend + testing pass 100%. Sem bugs críticos.
