# RELATORIO — worker BullMQ + bootstrap normalize

## Feito
- `worker.ts`: `maxRetriesPerRequest: null` (BullMQ/ioredis), logs de ingest e falhas.
- `bootstrap-normalize.ts`: promove 1618 anúncios órfãos sem depender do Redis.
- `work.env.example`: nota sobre formato `REDIS_URL` no Dokploy.

## Decidido por mim e por quê
- 1618 `anuncios` sem `anuncio_veiculo` = ingest/normalize não rodou; PG 18 não é causa.
- Script de bootstrap para destravar produção; fix do worker evita repetir.

## Pendente de decisão sua
- Redeploy do `work` e ver log `ingest: N normalize(s) enfileirado(s)`.
- Ou no container api/work: `npm run bootstrap-normalize --workspace=apps/api`.
