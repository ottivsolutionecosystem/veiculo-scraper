#!/usr/bin/env bash
set -Eeuo pipefail

# Nixpacks cria /app/.venv no build; o loop do coletor usa PYTHON_BIN.
if [ -z "${PYTHON_BIN:-}" ] && [ -x /app/.venv/bin/python3 ]; then
  export PYTHON_BIN=/app/.venv/bin/python3
fi

node apps/api/dist/src/worker.js &
worker_pid=$!

(
  cd services/collector
  exec /app/deploy/collector-loop.sh
) &
collector_pid=$!

cleanup() {
  kill "$worker_pid" "$collector_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$worker_pid" "$collector_pid"
