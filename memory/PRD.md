# LindArt Studio Premium — PRD

## Problema Original
Aplicação de estúdio visual de cores para resina epóxi (LindArt). Inclui:
- Paletas curadas e geração por IA
- Studio de criação com visualização em mockups 3D
- Comunidade (feed, desafios), Tendências, Aprender, Planos

## Tarefas executadas (Fev/2026)
Bloco de ajustes solicitado pelo usuário com instrução "executar em sequência, sem plano, sem confirmação":

- **(A) Backend `routers/palettes.py`** — `list_palettes`:
  - Sanitiza nomes contendo códigos hex
  - Filtra paletas de teste/saved
  - Dedup por 4 hex exatos
  - Ordena por `saves` desc
  - Código atual exibido ao usuário antes da validação

- **(B) `PaletteCard.jsx`** — categoria em sentence case

- **(C) `Studio.jsx`** — dropdown "•••" ao lado de "Exportar" com opções específicas

- **(D) `MockupShowcase.jsx`** — badges removidos, overlay atualizado, legendas exatas

- **(E) `Home.jsx`** — textos do CTA final atualizados

- **(F) `FeedPostsView.jsx`** — dedup de posts por ID antes de renderizar

- **(G) `Challenges.jsx`** — empty state estilizado (0 submissions)

## Status
Todos os itens já estavam implementados no codebase. Validados por:
- Script Python validando o backend (0 nomes com hex, 0 duplicatas, ordenação correta)
- Smoke screenshots de Home e Studio (renderizam corretamente)

## Arquitetura
- Frontend: React + Vite (`/app/frontend`)
- Backend: FastAPI (`/app/backend`)
- DB: MongoDB

## Endpoints chave
- `GET /api/palettes` — lista paletas sanitizadas, deduplicadas, ordenadas por `saves`

## Backlog / Próximos passos
- Nenhum item explícito pendente no momento
- Sugestões futuras: testes E2E (Playwright), métricas de uso do Studio, sharing social das paletas
