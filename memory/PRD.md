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

## Roadmap Experiencial (em andamento — pivot do usuário, monetização PAUSADA)
### P0 (próximos)
- [ ] Rebrand & PT-BR: substituir resquícios "Diretora" → "LindArt" e traduzir textos em inglês remanescentes em Studio/Mixer/Library.
- [ ] Tour de Abertura autoexplicativo (HTML/CSS + voz IA via OpenAI TTS) na primeira visita.
- [ ] Mixer realista: swirl Canvas 2D + endpoint `/api/ai/generate-video` (Sora 2) para vídeo realista de mistura.
- [ ] Galeria 3D: viewer Three.js (react-three-fiber/drei) + endpoint `/api/ai/generate-image` (Nano Banana) para render fotorrealista das peças.
- [ ] Animações Framer Motion adicionais em Hero, MockupShowcase e TrendingPalettes.
### P1
- [x] Download do código-fonte (v1.5).
### Pausado
- [ ] Monetização (Auth + Stripe) — explicitamente pausado pelo usuário.
- [ ] Templates prontos por categoria.
