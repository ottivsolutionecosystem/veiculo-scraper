#!/usr/bin/env bash
set -Euo pipefail

# Worker BullMQ + coletor Python (opcional). Cada um tem loop próprio de reinício.

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) work: $*" >&2; }

if [ -z "${PYTHON_BIN:-}" ] && [ -x /app/.venv/bin/python3 ]; then
  export PYTHON_BIN=/app/.venv/bin/python3
fi
if [ -z "${PYTHON_BIN:-}" ]; then
  export PYTHON_BIN="$(command -v python3 || true)"
fi

ROOT=/app
if [ ! -d "$ROOT/services/collector" ]; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

collector_should_run() {
  case "${COLLECTOR_ENABLED:-}" in
    false|0|no|NO|FALSE)
      return 1
    ;;
    true|1|yes|YES|TRUE)
      if [ -z "${BOT_CONTACT_URL:-}" ] || [ -z "${BOT_CONTACT_EMAIL:-}" ]; then
        log "FATAL coletor: COLLECTOR_ENABLED=true mas BOT_CONTACT_URL/BOT_CONTACT_EMAIL ausentes."
        return 1
      fi
      return 0
    ;;
    *)
      # Padrão: coletor junto só se BOT_CONTACT_* estão definidos (collector separado = omitir).
      [ -n "${BOT_CONTACT_URL:-}" ] && [ -n "${BOT_CONTACT_EMAIL:-}" ]
    ;;
  esac
}

run_collector() {
  while true; do
    if [ -z "${PYTHON_BIN:-}" ]; then
      log "FATAL coletor: python3 ausente. Worker segue. Nova tentativa em 15s."
      sleep 15
      continue
    fi
    log "coletor iniciando PYTHON_BIN=${PYTHON_BIN}"
    rc=0
    (
      cd "$ROOT/services/collector"
      exec bash "$ROOT/deploy/collector-loop.sh"
    ) || rc=$?
    log "coletor saiu rc=${rc}. Worker segue. Nova tentativa em 15s."
    sleep 15
  done
}

run_worker() {
  while true; do
    log "worker iniciando"
    rc=0
    node "$ROOT/apps/api/dist/src/worker.js" || rc=$?
    log "worker saiu rc=${rc}. Reiniciando em 5s."
    sleep 5
  done
}

run_worker &
worker_pid=$!
collector_pid=""

if collector_should_run; then
  run_collector &
  collector_pid=$!
else
  case "${COLLECTOR_ENABLED:-}" in
    false|0|no|NO|FALSE)
      log "coletor desabilitado (COLLECTOR_ENABLED=false). Raspagem no serviço collector."
      ;;
    *)
      log "coletor omitido (BOT_CONTACT_* ausentes). Raspagem no serviço collector ou defina variáveis aqui."
      ;;
  esac
fi

cleanup() {
  if [ -n "$collector_pid" ]; then
    log "sinal de parada — encerrando worker=${worker_pid} coletor=${collector_pid}"
    kill "$worker_pid" "$collector_pid" 2>/dev/null || true
  else
    log "sinal de parada — encerrando worker=${worker_pid}"
    kill "$worker_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [ -n "$collector_pid" ]; then
  wait "$worker_pid" "$collector_pid" || true
else
  wait "$worker_pid" || true
fi
