# RELATORIO — loading honesto da coleta + work resiliente

## Feito
- UI Fontes: `queued` / `stale` (coletor parado) / `started` (listando) /
  `running` (barra). Some o “Nunca executada” enquanto há pedido na fila.
- API: `pendingRequest.phase` (derivado; teste em scrape-status.test.ts).
- `start-work.sh`: coletor e worker com loop próprio; um cair não mata o outro.
- Loop do coletor com log FATAL e pulso em `/tmp/collector-ok`; healthcheck
  no Compose (`collector-health`).
- docs/DEPLOY.md e docs/API.md atualizados.

## Decidido por mim e por quê
- 90s sem `iniciado_em` = coletor parado (loop é 15s; folga de boot).
- Não mexi em `services/collector` (território fechado). Progresso na
  enumeração continua só no fim da listagem; a fase `started` cobre isso.

## Pendente de decisão sua
- No Dokploy: serviço `work` Running com `BOT_CONTACT_*` e o mesmo
  `DATABASE_URL` da api. Redeploy depois deste commit.
- O pedido das 14:16 segue na fila — não clique de novo.
