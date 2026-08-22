#!/usr/bin/env bash
set -Euo pipefail

# Coletor Python isolado (sem worker BullMQ). Equivalente ao serviço collector
# do docker-compose.prod.yml.

export PYTHONUNBUFFERED="${PYTHONUNBUFFERED:-1}"

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

cd "$ROOT/services/collector"
exec bash "$ROOT/deploy/collector-loop.sh"
