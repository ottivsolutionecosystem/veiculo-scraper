#!/usr/bin/env bash
set -Euo pipefail

# Worker BullMQ + coletor Python. Cada um tem o próprio loop de reinício:
# se o coletor cair (BOT_CONTACT ausente, python, Postgres), o worker segue.

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
run_collector &
collector_pid=$!

cleanup() {
  log "sinal de parada — encerrando worker=${worker_pid} coletor=${collector_pid}"
  kill "$worker_pid" "$collector_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait "$worker_pid" "$collector_pid" || true
