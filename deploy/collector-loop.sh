#!/bin/sh
# Equivalente Linux de scripts/collector-loop.ps1. Sem RPC: só Postgres.
set -eu

HEARTBEAT="${COLLECTOR_HEARTBEAT:-/tmp/collector-ok}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) coletor: $*" >&2; }

if [ -z "${DATABASE_URL:-}" ]; then
  log "FATAL: defina DATABASE_URL — o mesmo Postgres da api."
  exit 1
fi

HAS_BOT=0
if [ -n "${BOT_CONTACT_URL:-}" ] && [ -n "${BOT_CONTACT_EMAIL:-}" ]; then
  HAS_BOT=1
else
  log "aviso: BOT_CONTACT_* ausentes — só processa ingestão assistida (sem GET na fonte)."
fi

log "loop ingestao+pedidos shopcar a cada 15s (python=${PYTHON_BIN:-python3})"
while true; do
  date -u +%Y-%m-%dT%H:%M:%SZ > "$HEARTBEAT" || true

  log "ciclo ingestao listagens shopcar"
  if ! "${PYTHON_BIN:-python3}" -m captacao_bot.cli ingerir --fonte shopcar; then
    log "ingestao falhou; segue o ciclo"
  fi

  if [ "$HAS_BOT" -eq 1 ]; then
    log "ciclo pedidos shopcar"
    if ! "${PYTHON_BIN:-python3}" -m captacao_bot.cli pedidos --fonte shopcar; then
      log "pedido falhou; nova tentativa em 15s"
    fi
  else
    log "pulando pedidos (sem BOT_CONTACT_*)"
  fi

  sleep 15
done
