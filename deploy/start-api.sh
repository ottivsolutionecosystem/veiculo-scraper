#!/bin/sh
set -eu

echo "aplicando migrations..."
node apps/api/dist/scripts/migrate.js
node apps/api/dist/scripts/seed.js

exec node apps/api/dist/src/server.js
