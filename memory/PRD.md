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

### ✅ P2 — Backend Modularization Phase 2 Step 1: AI router (DONE em iter 26-fork, 2026-02)
- **`/app/backend/server.py`**: removidas 1370 linhas (1708 → 340). Deletados todos os endpoints `/api/ai/*` e `/api/ai/mentora`, modelos AI (`AIPromptRequest`, `VoiceRequest`, `ImageRequest`, `CaptionRequest`, `LuxuryScoreRequest`, `VisualDNARequest`, `MentoraMessage`, `MentoraRequest`, `TrendsRequest`, `CollectionRequest`) e helpers (`_map_llm_exception`, `_parse_llm_json`, `_hex_to_rgb`, `_rgb_to_hsl`, `_compute_heuristic_luxury`, `_hex_distance`, `_cluster_dominant_colors`, `_compute_dna_metrics`).
- **`/app/backend/server.py`**: adicionados `from routers.ai import router as ai_router` + `app.include_router(ai_router)`.
- **`/app/backend/routers/ai.py`** (1388 linhas): contém todas as 10 rotas AI com `APIRouter(prefix="/api", tags=["ai"])`. Rotas duplicadas `/dna/share` foram removidas pelo testing agent (continuam apenas em `server.py`).
- **Testing agent backend-only**: 23/23 testes passaram (100%). Zero regressões. Suite criada em `/app/backend/tests/test_p2_ai_refactor.py`.
- **Próximo (Step 2)**: extrair `/api/palettes/*` e `/api/dna/*` para `routers/palettes.py`.


### ✅ P1 — Fix FAL_KEY check order (DONE em iter 26-fork, 2026-02)
- **`/app/backend/routers/svd_video.py`** (`POST /api/onboarding/generate-welcome-video`): reordenadas as checagens. Agora a ordem é: 1) arquivo `WELCOME_VIDEO_PATH` já existe no disco → `200 {already_exists:true, url:...}`; 2) `_WELCOME_JOB.status == "processing"` → 200 processing; 3) só então `_fal_key()` → 503 se ausente.
- **Motivação**: antes, mesmo com o vídeo institucional já gerado e salvo em `/app/backend/static_assets/onboarding-welcome.mp4`, o endpoint retornava 503 quando `FAL_KEY` não estava no `.env`. Agora a idempotência é honrada.
- **`/app/backend/tests/test_refactor_og_svd.py`**: ajustado `test_generate_welcome_video_behavior` para refletir o novo contrato (checa disco antes via `Path`). Import `Path` adicionado.
- **Validação curl**: cenário 1 (sem FAL_KEY + sem arquivo) → 503 ✓; cenário 2 (sem FAL_KEY + arquivo presente) → 200 `already_exists:true` ✓; cenário 3 (cleanup) → 503 ✓. Pytest `TestOnboardingWelcomeVideo`: 2/2 passed.

### ✅ P2 — Extração SubmitChallengeModal (DONE em iter 25-fork, 2026-02)
- **`/app/frontend/src/components/SubmitChallengeModal.jsx`** (novo, default export): componente controlado puro com contrato estrito `{ isOpen, onClose, onSubmit, themeColor }`. `AnimatePresence` interno. Sem `fetch` interno — apenas valida (imagem obrigatória, handle do usuário via `useAuth`), parseia hex da paleta e chama `onSubmit(payload)` com `{ caption, image_base64, palette_colors }`. Mantém todos os `data-testid="challenge-submit-*"` originais.
- **`Challenges.jsx`** (`ChallengeDetailModal`): agora possui `handleSubmitChallenge(payload)` que faz `POST ${API_BASE}/api/challenges/${challengeId}/submissions` com `Authorization: Bearer` do `localStorage`. Em sucesso, prepende a submission criada em `detail.submissions`, fecha o modal e dispara toast. Função `SubmitModal` antiga embutida (≈180 linhas) e imports `Field`, `Image as ImageIcon` removidos.
- Testing agent (iter 25-fork): **100%** — 10/10 critérios. Network listener confirmou exatamente 1 `POST /api/challenges/{id}/submissions` 200 no submit válido (chamada originada do PAI), 0 calls em close-X/Cancel/submit-sem-imagem. Modal fecha após sucesso, submissão entra na galeria (4→5), toast "Peça enviada!" exibido. Auth gating (redirect /login) e regressão de vote validados.

### ✅ P1.5 — Modais "burros" (contrato controlado) (DONE em iter 24-fork, 2026-02)
- **`CreatePostModal.jsx`** e **`CreateItemModal.jsx`** refatorados para contrato estrito: props apenas `{ isOpen, onClose, onSubmit }`. AnimatePresence interno. Sem `fetch` interno — apenas chamam `onSubmit(payload)` com os dados do formulário.
- **`Feed.jsx`**: agora gerencia `showCreate` e implementa `onSubmit` fazendo `POST ${API_BASE}/api/feed` com `authHeaders()`. Em sucesso, prepende o novo post no state e fecha o modal. `useAuth` agora extrai `authHeaders` (não mais `user`). `AnimatePresence` removido do JSX (modal cuida disso).
- **`Marketplace.jsx`**: mesma estrutura — `onSubmit` faz `POST ${API_BASE}/api/marketplace`, prepende item e fecha modal.
- Correção importante: endpoints reais são `/api/feed` e `/api/marketplace` (não `/api/feed/posts` nem `/api/marketplace/items` como mencionado na conversa).
- Testing agent (iter 24-fork): **100%** — 10/10 critérios. Network listener confirmou exatamente 1 `POST /api/feed` + 1 `POST /api/marketplace` apenas no submit; close via X/Cancel = 0 calls. Modal fecha após sucesso, item aparece no topo. Zero regressões.

### ✅ P1 — Extração de modais Feed/Marketplace (DONE em iter 23-fork, 2026-02)
- **`/app/frontend/src/components/CreatePostModal.jsx`** (novo, default export): modal de novo post extraído de `Feed.jsx`. Props: `user`, `onClose`, `onCreated`. Mantém auth Bearer (`lindart.auth.token`), FileReader 4MB guard, parsing de tags/paleta hex, todos os `data-testid="feed-create-*"` originais.
- **`/app/frontend/src/components/CreateItemModal.jsx`** (novo, default export): modal de novo item extraído de `Marketplace.jsx`. Props: `user`, `onClose`, `onCreated`. Mantém categorias TYPES locais, parsing de preço BRL, todos os `data-testid="market-create-*"` originais (inclui 6 chips de tipo).
- **`Feed.jsx`** / **`Marketplace.jsx`**: imports `X`, `Field` (e `useMemo` no Marketplace) removidos quando não mais usados; `TOKEN_KEY` removido de Marketplace.jsx; modais inline substituídos por `<CreatePostModal />` / `<CreateItemModal />` com mesmas props.
- Testing agent (iter 23-fork): **100%** — 9 `feed-create-*` + 17 `market-create-*` (inclui 6 type chips) renderizam; open/close via cancel e X validados; `GET /api/feed` 200, `GET /api/marketplace` 200. Zero regressões.

### ✅ P0 — Modularização server.py Fase 1: OG + SVD Video (DONE em iter 22-fork, 2026-02)
- **`/app/backend/routers/og.py`** (novo, 177 linhas): extraídas rotas `GET /api/og/dna/{share_id}` e `GET /api/og/dna/{share_id}/image.svg`, helpers `_html_escape`, `_absolute_origin`, `_render_dna_og_html`, e `Environment` Jinja2 isolado. Prefix=`/api/og`.
- **`/app/backend/routers/svd_video.py`** (novo, 369 linhas): extraídas rotas `POST /api/ai/generate-video`, `GET /api/ai/video-status/{job_id}`, `GET /api/onboarding/welcome-video`, `POST /api/onboarding/generate-welcome-video`. Movidos helpers `_hex_to_rgb`, `_make_swirl_image_png`, `_run_svd_job`, `_run_welcome_video_job`, `_cleanup_video_jobs`, `_svd_set_job_error`, modelo `VideoRequest`, constantes `SVD_MODEL`/`SVD_DEFAULT_SIZE`, stores `_VIDEO_JOBS`/`_WELCOME_JOB`. `FAL_KEY` carregada lazy via `_fal_key()`.
- **`server.py`** reduzido de **2180 → 1709 linhas** (~470 linhas extraídas). Removidos imports `fal_client`, `jinja2`. Mantido `STATIC_DIR` (usado por `app.mount`). Adicionados `app.include_router(og_router)` e `app.include_router(svd_video_router)` no rodapé.
- Testing agent (iter 22-fork): **13/13 passed**, 1 skipped (FAL_KEY ausente — esperado). End-to-end OG (criar `dna_shares` → `/api/og/dna/{id}` 200 com paleta/handle/signature corretos). Zero regressões em `/api/auth/login`, `/api/feed`, `/api/marketplace`, `/api/challenges`, `/api/ai/generate-caption`. Test file: `/app/backend/tests/test_refactor_og_svd.py`.
- Observação minor (não-bloqueante): preview ingress sobrescreve `Cache-Control` em `/api/og/*` para `no-store` — verificar em produção.

### ✅ P0 — Refactor _render_dna_og_html → Jinja2 template (DONE em iter 23, 2026-02)
- **Backend** (`server.py`): adicionado `jinja2.Environment` com `FileSystemLoader(ROOT_DIR/'templates')` + `autoescape=select_autoescape(['html','xml'])` e `trim_blocks/lstrip_blocks`. `_render_dna_og_html` agora monta apenas as variáveis (signature, title, description, colors, redirect_path, redirect_abs, og_image_abs) e delega o markup ao template.
- **Template** (`/app/backend/templates/dna_og.html`): card OG completo (title, description, og:*, twitter:*, og:image abs, meta refresh, canonical, swatches via `{% for color in colors %}`, JS redirect com `{{ redirect_path|tojson }}`). Autoescape Jinja2 substitui o `_html_escape` manual em todas as variáveis.
- Smoke test (curl): seed dna_share com `signature="Aurora <Boreal>"` + `handle="ana<script>"` + 3 cores → HTTP 200, `<` escapado para `&lt;` em title/og:title/twitter:title (6 ocorrências), handle escapado (3 ocorrências), zero `<script>` cru injetado, swatches `background:#ff66aa…` corretos, JS redirect `window.location.replace("/dna/...")` com JSON encoding. Regressão `image.svg` HTTP 200 ✓.

### ✅ P0 — Centralização do componente Field (DONE em iter 23, 2026-02)
- **`/app/frontend/src/components/ui/Field.jsx`**: componente único com dois modos: (1) **input mode** (`value`+`onChange`, suporta `type`, `multiline`/`textarea`, `placeholder`, `hint`, `rows`, `testId`); (2) **children mode** (renderiza children dentro de wrapper com `.label-eyebrow`, usado por `MarketingPanel` para ChipRow e inputs custom). Detecção via `children !== undefined`.
- Importado em `Feed.jsx`, `Marketplace.jsx`, `Challenges.jsx`, `MarketingPanel.jsx`; declarações `function Field(…)` inline removidas dos 4 arquivos. Lint limpo.

### ✅ P0 — FAL_KEY backend-only + 404 estruturado em /api/profile (DONE em iter 22, 2026-02)
- **Backend** (`server.py` linhas 38-41): `FAL_KEY = os.environ.get('FAL_KEY')` + `os.environ['FAL_KEY'] = FAL_KEY` para `fal_client` pegar automaticamente; endpoints `/api/ai/generate-video` e `/api/onboarding/generate-welcome-video` retornam **503 com `detail` PT-BR** quando chave ausente (sem mais hardcode no frontend).
- **Backend** (`routers/profiles.py`): `GET /api/profile/{handle}` agora retorna **404 estruturado** `{detail:{error:"profile_not_found", message, handle}}` quando o handle não tem presença em `feed_posts`, `dna_shares`, `marketplace_items` nem `challenge_submissions`. `400` (invalid_handle) também estruturado.
- **Frontend** (`utils/api.js`): `chamarIA` agora trata `503` como erro terminal de configuração (tipo `"config"`) — sem mais retry exponencial inútil; expõe `detail` para a UI usar.
- **Frontend** (`components/MixerSwirl.jsx`): toast usa o `detail` PT-BR do backend quando disponível; botão reseta loading imediatamente em caso de 503.
- **Frontend** (`components/onboarding/OnboardingVideo.jsx`): `handleRetry` agora checa `r.ok` e `r.status === 503`; se chave ausente, exibe **alerta inline vermelho (KeyRound)** com mensagem do backend + toast + reseta `status: "idle"` (sem polling infinito). Botão muda label para "Tentar novamente".
- **Frontend** (`pages/PublicProfile.jsx`): erro 404 distinguido de erros de rede; UI elegante com card `backdrop-blur-md`, ícone `UserX` em círculo dourado, dois CTAs (`Voltar ao início` → `/`, `Explorar feed` → `/feed`) e mensagem PT-BR parseada do `detail` do backend.
- Testing: 4 curls smoke (HTTP 404 profile_not_found ✓, HTTP 503 video PT-BR ✓, HTTP 503 onboarding PT-BR ✓); screenshot script confirmou `profile-not-found-title`, `profile-not-found-home`, `profile-not-found-feed` visíveis.

### ✅ P0 — JWT em writes de comunidade (DONE em iter 21, 2026-02)
- **Backend** (`routers/feed.py`, `routers/marketplace.py`, `routers/challenges.py`): `POST /api/feed`, `POST /api/marketplace`, `POST /api/challenges/{id}/submissions` agora exigem `Depends(get_current_user)`. Handle e flag `verified=True` são derivados do usuário autenticado (cliente não pode forjar handle).
- **Frontend** — `Feed.jsx`, `Marketplace.jsx`, `Challenges.jsx`: removidos inputs manuais de handle nos modais; bloco "Postando/Anunciando/Enviando como @user + Perfil Verificado" (BadgeCheck dourado). Botões de submit/anunciar/enviar gateados por `isAuthenticated` → toast + redirect `/login`. Token Bearer + `credentials: include` em todos os POSTs protegidos. BadgeCheck também em cards de items/posts/submissions e no `winner.handle` quando `verified=true`.
- Testing agent iter21: backend 7/7 (401 sem token, 201 com token, GET inclui `verified`), frontend 5/5 (gate logged-out, modal sem campo handle, criação E2E, badge presente, regressão `/feed` ok). Zero bugs.

### ✅ P0 — Autenticação JWT (DONE em iter 20, 2026-02)
- **Backend** (`/app/backend/routers/auth.py`): `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — JWT HS256 + bcrypt via `passlib`, expiração 7d, seed automático no startup (`admin@lindart.app` / `teste@lindart.app`).
- **Frontend**: `AuthContext` (token persistido em `localStorage` `lindart.auth.token`), páginas `/login` e `/register`, `ProtectedRoute`, integração no `Navbar.jsx` (desktop dropdown com iniciais + nome + email + Logout; mobile section com avatar e botões).
- **Auth removida do escopo "público"**: app não é mais 100% anônimo; rotas existentes continuam abertas, mas há identidade real disponível para posts/marketplace no futuro.
- Testing agent iter20: 11/11 flows E2E (login válido/inválido, registro auto-login, persistência via reload, logout, dropdown desktop, mobile menu). Zero bugs.

### ✅ P1 — Trends focus tabs overflow fix (DONE em iter 20, 2026-02)
- `pages/Trends.jsx`: `flex flex-wrap` → `flex overflow-x-auto hide-scrollbar snap-x snap-mandatory md:flex-wrap md:overflow-visible` com `shrink-0 whitespace-nowrap` nos chips. Mobile agora rola horizontalmente sem cortar; desktop mantém wrap.

### ✅ P0 — Core (DONE)
- Mentora IA (chat criativo)
- Tendências da Semana
- Gerador de Coleções
- Mixer / Calculadora de Proporções / Comparador / Biblioteca
- DNA Share (URL pública por paleta)
- Onboarding + Tour de abertura

### ✅ P0 — Visualizador 3D fix (DONE iter 19, 2026-02)
- **Productions3D.jsx** corrigido: cena 3D estava escura porque `meshPhysicalMaterial` com alto `envMapIntensity` não tinha environment map → adicionado `<Environment preset="studio" />` do drei, ambientLight 0.5→0.9, novo `hemisphereLight`, `emissiveMap=texture` + `emissive=#ffffff` quando textura aplicada, metalness reduzido para 0.1-0.12 com textura.
- **UX de loading**: overlay com spinner + barra de progresso animada (~30s) + texto "Nano Banana renderizando… Isso leva cerca de 30 segundos". Botão agora exibe `Renderizando… N%` ao invés de string estática. Banner de erro com botão "Tentar novamente" (data-testid `prod3d-retry-btn`).
- **Texto de instruções**: era `text-[10px] text-zinc-500` (ilegível) → agora `text-xs text-zinc-300` com ícone `MousePointerClick` e ênfase em "Arraste"/"Scroll".
- **Backend `/api/ai/generate-image`**: aceita `style` e `palette_name`, monta prompt vívido por shape (geodo cluster, bandeja catch-all com fio dourado, colar gota com corrente) + descrição por estilo (geodo/mármore/oceano/galáxia/floral/luxo/etc.) — peça gerada agora corresponde a uma fotografia realista, não textura abstrata.
- Testing agent iter19: backend 8/8 pytest, frontend 100%, zero console errors.

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
- [ ] **Challenge System** — temas semanais com submissões da comunidade (POST/vote já protegidos por JWT)
- [x] ~~Auth real~~ — feito em iter20 (JWT)
- [x] ~~Proteger endpoints de escrita (feed/marketplace/challenges) com Bearer~~ — feito em iter21
- [ ] Centralizar `authFetch(url, opts)` em `AuthContext` com refresh/expiry handling (hoje cada page lê `localStorage` direto)
- [ ] Extrair componente compartilhado `<VerifiedAuthorChip user=.../>` (atualmente duplicado em Marketplace/Challenges)
- [ ] Tratamento de 401 nos modais protegidos: fechar modal + redirect `/login` automaticamente
- [ ] Fluxo E2E real de SVD 2.0 quando usuário fornecer `FAL_KEY`
- [ ] Refactor: extrair `CreatePostModal`/`CreateItemModal`/`SubmitModal` para arquivos próprios
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
**Iter 21 (2026-02)** — JWT protege writes de Feed/Marketplace/Challenges. Frontend Marketplace.jsx e Challenges.jsx alinhados ao padrão do Feed.jsx: removidos inputs manuais de handle, modais gateados por login (toast + redirect `/login`), Bearer token + credentials:include nos POSTs, "Perfil Verificado" (BadgeCheck dourado) ao lado de @handle em cards de items/posts/submissions/winner. Testing agent 7/7 backend + 5/5 frontend, zero bugs.

**Iter 20 (2026-02)** — Auth JWT (backend + frontend integrado no Navbar com dropdown desktop e seção mobile, persistência via localStorage). Páginas `/login` e `/register` funcionais, seed automático de `admin@lindart.app` e `teste@lindart.app`. P1 fix: chips de foco da página `/trends` agora rolam horizontalmente em mobile (era `flex-wrap` puro). Testing agent: 11/11 flows E2E auth, zero bugs.

**Iter 19 (2026-02)** — Fixes P0 Visualizador 3D: cena clara via Environment studio + emissiveMap, overlay de loading com barra de progresso, retry banner, instruções legíveis, prompt Nano Banana específico por shape+estilo. Backend 8/8 e frontend 100%. Sem bugs remanescentes.

**Iter 18 (2026-02)** — Migração Sora 2 → SVD 2.0 + OG tags absolutas + botão "Compartilhar no WhatsApp" no DNA Share Modal.
