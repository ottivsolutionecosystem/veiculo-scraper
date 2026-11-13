#!/bin/sh
set -eu

echo "aplicando migrations..."
node apps/api/dist/scripts/migrate.js
# Seed é idempotente; se falhar, a API ainda sobe (health/login).
if ! node apps/api/dist/scripts/seed.js; then
  echo "aviso: seed falhou — seguindo com a API" >&2
fi

exec node apps/api/dist/src/server.js
