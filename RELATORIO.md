# RELATORIO — API no ar, web sem alcançar

## Feito
- Log da api: migrations + listen `:3001` OK.
- `/api/*` no domínio ainda 500: rewrite do Next usava
  hostname bakeado (`http://api:3001`); no Dokploy o DNS
  costuma ser outro (ex. `crawler-api`).
- Proxy runtime em `app/api/[...path]` lê `API_URL` no request
  e devolve 502 com `apiUrl`/`detail` se falhar.

## Pendente de decisão sua
- No **crawler-web**, `API_URL` = hostname interno do api
  (tente `http://crawler-api:3001` se o serviço se chama assim).
- Deploy **crawler-web**.
- Fontes → Iniciar captura de novo.
