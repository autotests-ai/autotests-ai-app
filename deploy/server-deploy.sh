#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/autotests-ai-app}"
REPO_URL="${REPO_URL:-https://github.com/autotests-ai/autotests-ai-app.git}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch --all
git reset --hard origin/main

docker compose $COMPOSE_FILES build backend
docker compose $COMPOSE_FILES up -d --remove-orphans

curl -fsS http://127.0.0.1:8081/api/terminal | grep -q postgresql

bash deploy/smoke-remote.sh https://autotests.ai

if [[ -f deploy/nginx/autotests.ai.conf ]]; then
  REF_DIR="${REF_DIR:-/home/reference_app_copy/reference-app-copy}"
  if [[ -f "$REF_DIR/deploy/nginx/generated/autotests.ai-stack-upstreams.conf" ]]; then
    sudo env \
      STACK_UPSTREAMS="$REF_DIR/deploy/nginx/generated/autotests.ai-stack-upstreams.conf" \
      STACK_ROUTES="$REF_DIR/deploy/nginx/generated/autotests.ai-stack-routes.conf" \
      bash deploy/nginx/sync-nginx.sh
  else
    sudo bash deploy/nginx/sync-nginx.sh
  fi
fi

echo "Deploy OK: https://autotests.ai"
