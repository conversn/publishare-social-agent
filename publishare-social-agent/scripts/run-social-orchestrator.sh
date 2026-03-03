#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/funkyfortress/.publishare-social-worker"
WORKER_SCRIPT="$ROOT_DIR/scripts/social-orchestrator-worker.js"
NODE_BIN="${NODE_BIN:-/Users/funkyfortress/.nvm/versions/node/v22.22.0/bin/node}"

if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="/opt/homebrew/bin/node"
fi
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="/usr/local/bin/node"
fi
if [[ ! -x "$NODE_BIN" ]]; then
  echo "node binary not found in nvm/homebrew/usr-local paths" >&2
  exit 1
fi

cd "$ROOT_DIR"
set -a
source "$ROOT_DIR/.env.local"
set +a

exec "$NODE_BIN" "$WORKER_SCRIPT"
