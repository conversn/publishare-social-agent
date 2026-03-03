#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$ROOT_DIR/output/social-worker.log"
PID_FILE="$ROOT_DIR/output/social-worker.pid"

cd "$ROOT_DIR"

if pgrep -f "node scripts/social-content-job-worker.js" >/dev/null 2>&1; then
  echo "social-worker already running"
  exit 0
fi

mkdir -p "$ROOT_DIR/output"

set -a
source "$ROOT_DIR/.env.local"
set +a

nohup node scripts/social-content-job-worker.js </dev/null >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "social-worker started pid=$(cat "$PID_FILE")"
