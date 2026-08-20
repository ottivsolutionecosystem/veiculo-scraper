#!/usr/bin/env bash
set -Eeuo pipefail

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
