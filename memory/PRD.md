# LindArt — PRD (resumo curto)

## Estado atual (Fev/2026)
App React + FastAPI + MongoDB para criação de paletas de resina, marketplace, feed e desafios.

## Implementações recentes
- **Fix Visualizador Líquido (Hero "Em Destaque" + Studio)**: `ResinVisualizer.jsx` agora aplica corretamente as cores da paleta. Antes usava `globalCompositeOperation = "screen"` que somava cores claras a branco. Agora o fundo é derivado da cor mais escura da paleta, os blobs são ordenados por luminância e mesclados com `source-over` + alpha proporcional. Validado com paleta Geodo Imperial → resultado dourado/bronze.
- Tradução de hashtags PT-BR (`#OCEANO`, `#GEODO`, `#CÓSMICO`, `#FLORAL`).
- `CompareView3D.jsx` criado para visualização 3D no Comparador A vs B.
- `routers/seed_content.py` implementado (pendente: plugar no lifespan).

## Backlog priorizado
- **P0** Plugar `ensure_seed_content()` no lifespan do `server.py` + badge "EXEMPLO" no Marketplace.
- **P0** Reformulação da página `/pricing` (toggle mensal/anual, card Fundadoras 100/100, tabela comparativa).
- **P1** Validar Compare 3D end-to-end com testing_agent.
- **P2** Analytics `?ref=share`.
- **P2** Chip "v{n}" no Studio.
- **P3** `RequireAuth` em `/studio`, `/collections`, `/calculator`, `/mixer`.
- **P3** Centralizar `authFetch()`.

## Integrações
- fal.ai (Stable Video Diffusion 2.0) — chave do usuário
- Claude Sonnet 4.5, Gemini Nano Banana, OpenAI Whisper — Emergent LLM Key
