#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/selenoid/autotests-ai-app}"
REPO_URL="${REPO_URL:-https://github.com/autotests-ai/autotests-ai-app.git}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  sudo mkdir -p "$APP_DIR"
  sudo git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch --all
git reset --hard origin/main

docker compose build backend
docker compose up -d --remove-orphans

curl -fsS http://127.0.0.1:8081/api/terminal | grep -q postgresql

bash deploy/smoke-remote.sh https://autotests.ai

if [[ -f deploy/nginx/autotests.ai.conf ]]; then
  bash deploy/nginx/sync-nginx.sh
fi

echo "Deploy OK: https://autotests.ai"
