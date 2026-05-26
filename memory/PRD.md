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
- [ ] Comparador A vs B de paletas (lado a lado com diferença perceptual)
- [ ] Calculadora de precificação (custo material + mão de obra + margem)
- [ ] Calculadora de medidas (peças por molde 3D)
- [ ] Mais mockups (mesa, jóias close-up) + estilos isolados em galeria
### P2
- [ ] Onboarding tour com tooltips (Joyride/Shepherd)
- [ ] Atalhos de teclado (G = gerar IA, S = salvar, E = exportar)
- [ ] Templates prontos por categoria (joalheria, decoração, mesa, geodo)
- [ ] Misturador físico de cores em tempo real (mistura perceptual LAB)
- [ ] Share via URL com paleta serializada no hash
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
