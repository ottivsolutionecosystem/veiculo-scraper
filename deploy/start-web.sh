#!/bin/sh
set -eu

# Next.js standalone (outputFileTracingRoot = raiz do monorepo) gera:
#   apps/web/.next/standalone/apps/web/server.js
# O Docker copia esse tree para /app; no Nixpacks o artefato fica no lugar.

STANDALONE="apps/web/.next/standalone"
SERVER="$STANDALONE/apps/web/server.js"

if [ ! -f "$SERVER" ]; then
  echo "Next.js standalone nao encontrado em $SERVER" >&2
  echo "O build do web precisa de output: standalone." >&2
  exit 1
fi

# CSS/JS do cliente e arquivos de /public nao entram no standalone.
mkdir -p "$STANDALONE/apps/web/.next"
if [ -d apps/web/.next/static ] && [ ! -d "$STANDALONE/apps/web/.next/static" ]; then
  cp -a apps/web/.next/static "$STANDALONE/apps/web/.next/static"
fi
if [ -d apps/web/public ] && [ ! -d "$STANDALONE/apps/web/public" ]; then
  cp -a apps/web/public "$STANDALONE/apps/web/public"
fi

export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
exec node "$SERVER"
