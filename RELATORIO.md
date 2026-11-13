# RELATORIO — fila de ingestão ok; coletor parado

## Feito
- Página #1 enfileirada (`na fila` desde 15:10) — API/UI ok.
- Diagnóstico: item sem `iniciado_em` = serviço **collector/work** não
  está rodando o loop `ingerir` (não é Cloudflare nem HTML).
- Ajuste: `COLLECTOR_ENABLED=true` sobe o loop mesmo sem `BOT_CONTACT_*`
  (só ingestão assistida). UI avisa “Coletor parado” após ~90s.

## Decidido por mim e por quê
- O HTML já está na Postgres; sem o Python no ar a fila não anda.
- Não inventei processamento na API (fronteira TS/Python = Postgres).

## Pendente de decisão sua
- Dokploy: **Redeploy/Restart do serviço collector** (e/ou work com
  `COLLECTOR_ENABLED=true` + mesmo `DATABASE_URL`). Em ~15s o #1 deve
  sair de “na fila” para “ok: N novos…”.
