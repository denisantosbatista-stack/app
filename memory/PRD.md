# LindArt — Studio de Resina Premium · PRD

## Problema Original (resumo)
Refatorar app monolítico HTML (`lindart-v8-1.html`) — sofrendo de CSS gigante em arquivo único, sem animações modernas, sem persistência real, sem preview realista, sem IA, sem exportação — para uma aplicação **React modular premium** com Tailwind, Framer Motion, Zustand, FastAPI, MongoDB e Claude Sonnet 4.5.

## Arquitetura
- **Frontend**: React + CRA + Tailwind + Framer Motion + Zustand + React Hot Toast + Lucide + html2canvas + jspdf
- **Backend**: FastAPI + Motor (MongoDB async) + emergentintegrations (Claude Sonnet 4.5)
- **DB**: MongoDB (`/api/palettes` CRUD)
- **Estilo**: Dark luxury, dourado #D4AF37, glassmorphism, gradientes animados, glow premium

## Estrutura de pastas (frontend)
```
src/
├── components/   Navbar, MobileNav, Hero, ResinVisualizer, PieceShape, PaletteCard,
│                 AIGenerator, ExportModal, MockupShowcase, TrendingPalettes, ToolsGrid
├── pages/        Home, Studio, Library, Calculator, Tips
├── store/        usePaletteStore.js (Zustand + persist)
├── utils/        color.js, export.js
├── data/         palettes.js (12 presets + 10 styles + 10 piece shapes + 3 mockups)
└── index.css     Design tokens + glass utilities
```

## Personas
- **Artista de resina amador** que quer paletas prontas + visualização rápida
- **Profissional de joalheria** que precisa exportar paletas em CSS/Tailwind/JSON
- **Criador que monetiza** (Etsy, Instagram) — preview de peças vende a ideia

## Core Requirements (entregues nesta v1.0)
- [x] Arquitetura modular (components/pages/hooks/utils/data/store)
- [x] Stack moderna: Tailwind + Framer Motion + Zustand + Lucide + React Hot Toast
- [x] Tema premium dark luxury com dourado + glassmorphism + glow + gradientes animados
- [x] Hero cinematográfica (parallax, partículas flutuantes, mockup grande animado)
- [x] Preview real (3 mockups gerados por IA: relógio, bandeja, geodo) + 10 silhuetas SVG de peças com gradientes das paletas
- [x] **IA de paletas (Claude Sonnet 4.5)** — prompt PT-BR → paleta JSON estruturada (4 cores, roles, nome, style, tags)
- [x] Responsividade real (navbar inferior mobile, cards full-width, thumb reach)
- [x] Exportação: CSS Variables, Tailwind config, JSON, PNG (html2canvas), PDF (jsPDF)
- [x] Sistema de favoritos persistido em MongoDB
- [x] Componente de paleta com: copiar HEX, salvar, favoritar, exportar, compartilhar
- [x] Visualizador líquido (canvas 2D com metaballs + veios dourados + shimmer)
- [x] Calculadora de proporções (volume, ratio resina:endurecedor, pigmento %, presets)
- [x] Página de Técnicas (8 cards de boas práticas)
- [x] Biblioteca filtrada (todas / favoritas / IA / minhas)
- [x] Busca + filtro por estilo no Studio
- [x] Trending palettes + marquee de inspiração + ToolsGrid

## Status atual de testes
- Backend: **10/10 testes pytest passando (100%)** — IA, CRUD, filtros, 404, sem leak de ObjectId
- Frontend: Validado via screenshot — IA gera, salva, exporta, troca peça/estilo

## Backlog (próximas iterações)
### P1
- [x] Comparador A vs B de paletas (lado a lado com diferença perceptual) — entregue v1.2
- [x] Share via URL com paleta serializada (querystring `?c=hex-hex-...&n=Nome`) — entregue v1.2
- [x] Calculadora de precificação (custo material + mão de obra + margem) — entregue v1.2
- [x] Mais mockups (mesa, jóias close-up) + estilos isolados em galeria — 9 mockups disponíveis (v1.1+)
- [x] Calculadora de medidas (peças por molde 3D) — entregue v1.4
### P2
- [ ] Onboarding tour com tooltips (Joyride/Shepherd)
- [x] Atalhos de teclado (G = gerar IA, S = salvar, E = exportar, F = favoritar, ? = ajuda) — entregue v1.3
- [ ] Templates prontos por categoria (joalheria, decoração, mesa, geodo)
- [x] Misturador físico de cores em tempo real (mistura perceptual OKLab) — entregue v1.4
### P3 (monetização)
- [ ] Plano Premium (paletas ilimitadas com IA + exportação em alta)
- [ ] Marketplace de paletas premium criadas pela comunidade
- [ ] Integração Etsy/Mercado Livre (templates de fotos com paleta)

## API
- `GET /api/` — health
- `POST /api/ai/generate-palette` — Claude Sonnet 4.5 (body: `{ prompt, style? }`)
- `GET /api/palettes?favorite=true` — listar (com filtro)
- `POST /api/palettes` — salvar
- `PATCH /api/palettes/{id}` — atualizar favorite/tags/name
- `DELETE /api/palettes/{id}` — remover

## Datas
- 2026-05-26: v1.0 entregue — refatoração completa, IA, persistência, exportação, preview, tema premium
- 2026-05-28: v1.1 entregue — 7 melhorias P0+P1 validadas end-to-end (testing agent: 7/7 frontend, 10/10 backend)
  1. Frases motivacionais cíclicas no loading da IA (loadingPhrases.js + AIGenerator)
  2. Novas peças (chaveiro, prisma, cubo, sousplat, luminária) em 3 categorias
  3. 4 novos acabamentos de luxo (pavê-cristais, foil-dourado, holográfico, espelhado)
  4. Loading progressivo (LibrarySkeleton + shimmer-sweep) na Biblioteca
  5. Imagens reais (CDN) no MockupShowcase (relógio, bandeja, geodo)
  6. Calculadora de proporções funcional (volume/ratio/pigmento + presets + peso)
  7. Imagens atmosféricas reais nas Trending Palettes (PALETTE_PHOTOS)
- 2026-05-28: v1.2 entregue — Share + Comparador A/B + ajustes mobile
  - Compartilhamento via URL: botão `Share2` no Studio gera `studio?c=hex-hex-...&n=Nome`, copia para clipboard e exibe toast; ao abrir o link a paleta é importada automaticamente e a query é limpa.
  - Página `/compare` (A vs B): seleção independente de A e B, swap, métricas WCAG (contraste min) + diversidade ΔE perceptual + temperatura, matriz de contraste 4×4 com pares acessíveis (AA/AAA), share individual de cada lado, copy hex inline.
  - Mobile bottom-nav reduzido para 4 itens (Início, Studio, Salvos, A/B) com max-w-[180px] para não colidir com o badge fixo da plataforma; itens Custo/Dicas seguem acessíveis pelo header desktop.
  - Fallback `onError` no `<img>` do `MockupShowcase` (gradiente dourado/preto) para resiliência caso CDN externo falhe.
- 2026-05-28: v1.3 entregue — Atalhos de teclado + validação E2E
  - Atalhos globais no Studio: **G** (foca prompt da IA + scroll), **S** (salva paleta ativa), **E** (abre modal de exportar), **F** (favoritar), **?** (toast de ajuda). Ignora quando o foco está em input/textarea/select.
  - Hint visual com `<kbd>` no header do Studio (data-testid `keyboard-shortcuts-hint`).
  - testing_agent_v3_fork iteração 4: **8/8 cenários v1.2 PASSED** + 6/6 rotas sem erro de console.
  - Calculadora de precificação validada (R$ 226.25 → 451.25 com price-hourly de 40 → 100; lucro/margem atualizam dinâmicos).

- 2026-05-29: v1.4 entregue — Mixer OKLab + Calculadora de Medidas 3D + correções de imagens
  - **/mixer** (nova rota + link no Navbar desktop e MobileNav): mistura perceptual OKLab/RGB entre Cor A e Cor B com 11 stops (10 incrementos), ΔE (deltaE76) e par sugerido. Inputs `mixer-color-a-hex` / `mixer-color-b-hex`, stops `mixer-stop-{0..10}`, copy `mixer-result-oklab-copy` / `mixer-result-rgb-copy`, sugestões `mixer-suggestion-{i}`.
  - **Calculator → aba Medidas (3D)** (`calc-tab-measure` → `calc-measure-panel`): 6 formatos (cilindro/esfera/semiesfera/retângulo/cubo/anel) com dimensões dinâmicas, % perda configurável, resultado em `result-piece-vol` / `result-resin-needed` / `result-pieces-per-batch`.
  - URLs Unsplash 404 do MockupShowcase / TrendingPalettes / palettes.js substituídas por imagens válidas (regressão de imagens: 0 quebradas).
  - HTML `<title>` corrigido para “LindArt — Studio Premium de Resina” + meta description otimizada.
  - testing_agent_v3_fork iteração 5: **backend 100% + frontend 100%**, PDF export Studio gera 5140 bytes válidos, PNG 64KB, sem bugs críticos.

- 2026-05-29: v1.5 entregue — Download do código-fonte (P1 do roadmap experiencial)
  - Backend: novo endpoint `GET /api/download/source` que gera dinamicamente um ZIP do código (`backend/` + `frontend/`) com `StreamingResponse`. Exclui automaticamente diretórios e arquivos sensíveis: `node_modules`, `.git`, `.env*`, `__pycache__`, `build`, `dist`, `.venv`, `.emergent`, `.DS_Store`, `*.pyc`, `*.log`. Inclui `README.md` + `design_guidelines.json` do topo e gera `LINDART_README.md` com instruções de setup (uvicorn + yarn) dentro do ZIP. Filename com timestamp UTC: `lindart-source-YYYYMMDD-HHMMSS.zip`.
  - Frontend: botão `Código` (Lucide `Download`) adicionado no `Navbar.jsx` (data-testid `download-source-btn`) que faz `fetch` no endpoint, captura o `Content-Disposition`, cria `Blob` + objectURL e dispara o download com toast de feedback (`react-hot-toast`).
  - Validação: ZIP gerado tem 320KB, 104 arquivos, sem `.env` e sem `node_modules`. Backend pytest 10/10 ainda passando. Smoke screenshot OK.

- 2026-05-29: v1.6 entregue — Galeria 3D + Mixer Sora 2 + Tour autoexplicativo validados E2E
  - **R3F crash em /studio resolvido**: data-testid agora vive no `div` wrapper (não no `<Canvas>`) e `<Environment preset='studio'>` (drei) foi removido — eliminando os erros `R3F: Cannot set x-line-number` e `Cannot convert undefined or null to object` reportados na iteração 7.
  - **Productions3D.handleGenerate**: try/catch com `toast.loading/success/error` (mesmo `tid`) garante feedback explícito em qualquer cenário — fim do "silent failure" em que o botão re-habilitava em 1s sem toast.
  - **MixerSwirl.jsx**: integração com Sora 2 via `/api/ai/generate-video` + polling em `/api/ai/video-status/{id}` (cap 90 tentativas / ~7.5min) com timeout gracioso.
  - **OpeningTour.jsx**: cache de áudios narrados por step (`Map` de `objectURL`s com revoke no unmount) — sem memory leak.
  - **Backend**: 18/18 pytest passando (test_lindart_api.py + test_lindart_ai.py). `/api/download/source` validado em 352KB ZIP.
  - **testing_agent_v3_fork iteração 8**: backend 100% + frontend 100%, zero ui_bugs / zero integration_issues / zero design_issues.

- 2026-05-29: v1.7 entregue — Marketing & Avaliação (Studio) + DNA Visual (Library) + Mobile Nav 7 abas
  - **Studio · Marketing & Avaliação** (`/app/frontend/src/components/MarketingPanel.jsx`):
    - Aba "Legenda IA": gera headline + legenda + hashtags + alt_text via `POST /api/ai/generate-caption`. Toggles Plataforma (Instagram/TikTok/Etsy) e Tom (Luxuoso/Poético/Divertido/Minimalista) + input livre de tipo de peça.
    - Aba "Luxury Score": `POST /api/ai/luxury-score` retorna score 0-100, tier, métricas (contraste/harmonia/profundidade/sofisticação), parecer e 3 sugestões.
    - Renderizado em `Studio.jsx` recebendo `palette={activePalette}` (disabled gracioso quando sem cores).
  - **Library · DNA Visual** (`/app/frontend/src/components/VisualDNAPanel.jsx`):
    - Painel accordion no topo de `/library` (só monta quando `saved.length>0`).
    - `POST /api/ai/visual-dna` (Claude Sonnet 4.5) com clustering determinístico de cores dominantes + heurística de luxo (`_compute_dna_metrics`), combinado com parecer poético da IA.
    - Sections: Assinatura, Mood (chips), Cores Dominantes (6 swatches), Médias do Acervo (5 barras animadas), Estilos Recorrentes, Recomendações, Próxima Paleta Sugerida + CTA "Usar no Studio".
    - Pluralização PT-BR ajustada ("1 paleta analisada" / "N paletas analisadas").
  - **MobileNav 7 abas**: `overflow-x-auto` + `shrink-0` + `pr-24` reservando espaço para badge Emergent — todas as 7 abas (Início, Studio, Salvos, Mixer, Proporções, A/B, Técnicas) acessíveis via swipe horizontal.
  - **Backend novos endpoints**: `/api/ai/visual-dna` (linha 857), `/api/ai/luxury-score` (linha 669), `/api/ai/generate-caption` (linha 457).
  - **testing_agent_v3_fork iteração 11**: frontend 5/5 críticos PASS, zero bugs bloqueantes.

- 2026-05-29: v1.8 entregue — Cartão de DNA Visual Compartilhável (viral loop)
  - **Backend**: `POST /api/dna/share` persiste snapshot do DNA Visual (payload + handle opcional, truncado em 40 chars) e retorna `{id, path}`. `GET /api/dna/share/{id}` devolve o doc sem `_id`; 404 limpo para id inválido. Coleção `db.dna_shares`.
  - **Frontend componentes**:
    - `DNAShareCard.jsx`: cartão 1080×1080 com header, assinatura, mood chips, cores dominantes + hex labels, próxima paleta sugerida e rodapé (@handle + cor dominante + "lindart.studio"). Suporta `compact` (scale 0.5) para preview.
    - `DNAShareModal.jsx`: portal modal com preview, input @handle, botão "Baixar PNG 1080×1080" (html2canvas) e "Gerar link público" com botão Copiar.
    - `PublicDNAPage.jsx` (rota `/dna/:id`): rota pública sem auth, branch `isPublic` em `App.js` esconde Navbar/MobileNav. Estados de loading, erro 404 e download PNG.
  - **Wiring**: `VisualDNAPanel.jsx` agora exibe CTA "Compartilhar cartão" (`data-testid='dna-share-open'`) que abre o modal com o DNA gerado.
  - **testing_agent_v3_fork iteração 12**: backend 100% (6/6 pytest) + frontend 100% E2E (seed → DNA → modal → handle → link → PNG → rota pública → 404). Zero bugs.


## Roadmap Experiencial (em andamento — pivot do usuário, monetização PAUSADA)
### P0 (próximos)
- [x] Rebrand & PT-BR principal: títulos, navbar e fluxos principais traduzidos. (resquícios pontuais podem ser refinados sob demanda)
- [x] Tour de Abertura autoexplicativo (4 steps + voz IA via OpenAI TTS) na primeira visita. (v1.6)
- [x] Mixer realista: swirl Canvas 2D + Sora 2 (`/api/ai/generate-video`) com polling. (v1.6)
- [x] Galeria 3D: viewer react-three-fiber + Nano Banana (`/api/ai/generate-image`) como textura PBR. (v1.6)
- [ ] Animações Framer Motion adicionais em Hero, MockupShowcase e TrendingPalettes (refino).
### P1
- [x] Download do código-fonte (v1.5).
### Pausado
- [ ] Monetização (Auth + Stripe) — explicitamente pausado pelo usuário.
- [ ] Templates prontos por categoria.
