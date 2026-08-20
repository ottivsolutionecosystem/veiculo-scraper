#!/bin/sh
# Equivalente Linux de scripts/collector-loop.ps1. Sem RPC: só Postgres.
set -eu
if [ -z "${BOT_CONTACT_URL:-}" ] || [ -z "${BOT_CONTACT_EMAIL:-}" ]; then
  echo "Defina BOT_CONTACT_URL e BOT_CONTACT_EMAIL (User-Agent do bot)." >&2
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Defina DATABASE_URL." >&2
  exit 1
fi
echo "coletor em loop (pedidos shopcar a cada 15s)"
while true; do
  python -m captacao_bot.cli pedidos --fonte shopcar || echo "pedido falhou; nova tentativa em 15s" >&2
  sleep 15
done
