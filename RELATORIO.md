# RELATORIO — web.toml alinhado ao api

## Feito
- `deploy/nixpacks/web.toml` ficou no mesmo formato do `api.toml`:
  setup node 20, `npm ci`, `npm run build --workspace=apps/web`,
  start via `sh deploy/start-web.sh`.
- Cópia de `.next/static` e `public` sai do build e fica só no
  `start-web.sh` (o Next standalone não inclui esses assets).

## Decidido por mim e por quê
- Não duplicar `cp` no toml: o script de start já sabe o caminho do
  monorepo (`apps/web/.next/standalone/apps/web/server.js`).

## Pendente de decisão sua
- Redeploy do `web`. Se o Start Command estiver fixo no Dokploy,
  use `sh deploy/start-web.sh`.
