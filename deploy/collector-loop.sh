#!/bin/sh
# Equivalente Linux de scripts/collector-loop.ps1. Sem RPC: só Postgres.
set -eu

HEARTBEAT="${COLLECTOR_HEARTBEAT:-/tmp/collector-ok}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) coletor: $*" >&2; }

if [ -z "${BOT_CONTACT_URL:-}" ] || [ -z "${BOT_CONTACT_EMAIL:-}" ]; then
  log "FATAL: defina BOT_CONTACT_URL e BOT_CONTACT_EMAIL (User-Agent do bot)."
  log "FATAL: o painel grava o pedido; sem isso ninguém raspa. Variáveis no serviço work/collector, não só na api."
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ]; then
  log "FATAL: defina DATABASE_URL — o mesmo Postgres da api."
  exit 1
fi

log "loop de pedidos shopcar a cada 15s (python=${PYTHON_BIN:-python3})"
while true; do
  date -u +%Y-%m-%dT%H:%M:%SZ > "$HEARTBEAT" || true
  log "ciclo pedidos shopcar"
  if ! "${PYTHON_BIN:-python3}" -m captacao_bot.cli pedidos --fonte shopcar; then
    log "pedido falhou; nova tentativa em 15s"
  fi
  sleep 15
done
