# LindArt — PRD

## Problema
Plataforma de paletas, estúdio criativo, feed social, desafios e DNA Visual para designers/criadores.

## Estado atual (Fev/2026)
App em produção com backend FastAPI + frontend React + MongoDB. Última rodada de tweaks (Tasks A–G) aplicada e testada.

## Mudanças desta sessão (Fev/2026) — Tasks A–G

### A) Backend `backend/routers/palettes.py`
- L22: `import re`
- L144–168: regex `_HEX_NAME_RE`, `_TEST_NAME_RE` + helpers `_sanitize_palette_name`, `_is_test_palette`, `_hex_key`
- L177–205: `list_palettes` agora:
  1. Sanitiza nomes com hex → "Mistura Personalizada"
  2. Filtra teste (is_test=True, description contém "teste", name=="Trend Salva", source=="test", prefixos legados)
  3. Dedup por tupla ordenada dos 4 hex em UPPER (case-insensitive, ordem-independente), mantendo a com mais saves
  4. Sort por saves desc

### B) `frontend/src/components/PaletteCard.jsx`
- L7–14: labels em sentence case (Geodo, Floral, Pastel, Luxo, Minimalista, Oceano, Mármore, Galáxia)
- L39–42: `styleId` + `categoryLabel` dinâmico (sentence case)
- L108–113: badge sem `uppercase`, com `tracking-[0.04em]`, exibe `{categoryLabel}`

### C) `frontend/src/pages/Studio.jsx`
- L249–278: botão `MoreHorizontal` (•••) ao lado de "Exportar" abre menu com Salvar, Favoritar, Versões (se salva), Compartilhar
- testids: `palette-actions-menu-btn`, `palette-actions-menu`, `save-palette-btn`, `fav-palette-btn`, `versions-palette-btn`, `share-palette-btn`

### D) `frontend/src/components/MockupShowcase.jsx`
- L107–119: overlay hover simplificado — apenas "Visualizar no Studio →" (removidos "Inspiração", "Visualize no Studio" duplicado e "Explorar peça")
- L121–134: removidos badges "Premium" e label fixa antiga; agora exibe `m.label` + `m.legend` se houver
- testids: `mockup-overlay-${m.id}`, `mockup-label-${m.id}`, `mockup-legend-${m.id}`

### E) `frontend/src/pages/Home.jsx`
- L57: CTA final → "Começar grátis — sem cartão"
- L60–66: subtexto novo `home-final-cta-subtext`: "Plano gratuito disponível · cancele quando quiser"

### F) `frontend/src/pages/Feed.jsx` + `frontend/src/components/FeedPostsView.jsx`
- Feed L181–186: dedup por `id||_id` via `new Map(...)` **antes** de distribuir nas 4 colunas
- FeedPostsView L82–104: segunda barreira — `Set` de IDs já renderizados pula duplicatas em runtime

### G) `frontend/src/pages/Challenges.jsx`
- L144: `isEmpty = (submissions_count || 0) === 0`
- L148–175: card vira `motion.div` (não mais `motion.button`); wrapper interno com `opacity: 0.85` quando vazio
- L165–172: badge "Seja a primeira ✦" em `gold/10 + border-gold/50` quando `isEmpty`
- L222–230: botão "Abrir desafio →" extraído para fora do wrapper opaco (sempre `opacity:1`), com testid `challenge-open-btn-${ch.id}`

## Validações executadas

### Backend (curl + python3)
- T1 — sanitização hex → "Mistura Personalizada": ✅
- T2 — filtro teste: ✅ 0 vazamentos
- T3 — dedup case-insensitive, ordem-independente: ✅ (verificado pelas 5 tuplas distintas)
- T4 — múltiplas "Mistura Personalizada" são paletas legitimamente distintas (hex sets diferentes), não duplicatas
- T5 — sort saves desc: ✅

### Frontend (screenshots smoke)
- T7 — Home: CTA + subtexto ✅
- T8 — Studio: dropdown ••• ✅
- T11 — categorias sentence case ✅
- T12 — MockupShowcase sem badges antigos ✅


## [2026-06-01] Aba 🎙 Podcasts no Feed
- Aba "🎙 Podcasts" no `Feed.jsx` agora sempre visível ao lado de "Posts" (antes só renderizava com dados).
- Fetch lazy de `GET /api/podcasts` ao ativar a aba, com estado `podcastsLoading`/`podcastsLoaded`.
- Grid responsivo 1/2 colunas via `PodcastCard`, link "Ver todos os episódios →" → `/posts`.
- Empty state amigável: "Episódios em breve — fique de olho nas conversas do ateliê. 🎙".
- Erros tratados silenciosamente (cai em empty state). Apenas `Feed.jsx` alterado.
- T1–T6 validados via Playwright + curl `/api/podcasts`.

## Backlog / P1
- Testes automatizados pytest em `/app/backend/tests` para `list_palettes` (filtro, dedup, sort)
- Adicionar `Cypress`/`Playwright` cobrindo T6–T16 visualmente

## Backlog / P2
- Telemetria de uso do menu ••• (qual ação é mais clicada)
- A/B test do novo CTA "Começar grátis — sem cartão" vs. legado "Abrir Studio"
