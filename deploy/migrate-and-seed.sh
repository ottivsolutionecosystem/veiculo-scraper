#!/bin/sh
set -eu
node dist/scripts/migrate.js
node dist/scripts/seed.js
