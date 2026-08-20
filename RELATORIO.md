# RELATORIO — web Nixpacks (server.js)

## Feito
- Start do `web` no Dokploy falhava: `Cannot find module '/app/apps/web/server.js'`.
- Com `output: standalone` no monorepo, o Next gera
  `apps/web/.next/standalone/apps/web/server.js` — não `apps/web/server.js`.
- `deploy/start-web.sh` sobe esse arquivo e, se faltar, copia `.next/static`
  e `public` para dentro do standalone (o Next não inclui esses assets).
- `web.toml` agora usa o script; o Dockerfile também copia `public`.

## Decidido por mim e por quê
- Espelhar o `api` (`start-*.sh`) em vez de um `node ...` solto no toml:
  o caminho do standalone depende do `outputFileTracingRoot`.
- Copiar static/public no build e de novo no start só se ainda não
  estiverem lá: Dokploy às vezes sobrescreve o comando de start.

## Pendente de decisão sua
- Redeploy do serviço `web`. Se o Start Command estiver fixo no painel
  do Dokploy, troque para `sh deploy/start-web.sh`.
