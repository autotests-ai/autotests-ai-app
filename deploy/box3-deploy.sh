#!/usr/bin/env bash
# Box3 deploy: autotests.ai landing + nginx stack routes from autotests-ai-multistack-app.
# Run as qaguru on 212.92.101.15 — git/docker without sudo; nginx via sudo.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/autotests-ai-app}"
REF_DIR="${REF_DIR:-/home/reference_app_copy/autotests-ai-multistack-app}"
REPO_URL="${REPO_URL:-https://github.com/autotests-ai/autotests-ai-app.git}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

if [[ "$(id -un)" == "root" ]]; then
  echo "Run as qaguru, not root (sudo only for nginx)." >&2
  exit 1
fi

if ! sudo -u reference_app_copy test -d "$REF_DIR/.git"; then
  echo "Missing autotests-ai-multistack-app at $REF_DIR" >&2
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Cloning $REPO_URL → $APP_DIR"
  git clone --depth 1 "$REPO_URL" "$APP_DIR.tmp"
  rsync -a "$APP_DIR.tmp/" "$APP_DIR/"
  rm -rf "$APP_DIR.tmp"
fi

echo "=== autotests-ai-multistack-app ==="
sudo -u reference_app_copy bash -lc "cd \"$REF_DIR\" && git fetch --all && git reset --hard origin/main && python deploy/nginx/render_vhosts.py"

echo "=== autotests-ai-app ==="
git -C "$APP_DIR" fetch --all
git -C "$APP_DIR" reset --hard origin/main

cd "$APP_DIR"
docker compose $COMPOSE_FILES build backend
docker compose $COMPOSE_FILES up -d --remove-orphans

for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8081/api/terminal >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:8081/api/terminal | grep -q postgresql
curl -fsS http://127.0.0.1:8081/stack/matrix.json | grep -q '"backends"'

echo "=== nginx ==="
sudo cp "$REF_DIR/deploy/nginx/generated/reference-app-copy.autotests.ai.conf" \
  /etc/nginx/sites-available/reference-app-copy.autotests.ai
sudo ln -sf /etc/nginx/sites-available/reference-app-copy.autotests.ai \
  /etc/nginx/sites-enabled/reference-app-copy.autotests.ai

sudo env \
  STACK_UPSTREAMS="$REF_DIR/deploy/nginx/generated/autotests.ai-stack-upstreams.conf" \
  STACK_ROUTES="$REF_DIR/deploy/nginx/generated/autotests.ai-stack-routes.conf" \
  NGINX_CONF_SRC="$APP_DIR/deploy/nginx/autotests.ai.conf" \
  bash "$APP_DIR/deploy/nginx/sync-nginx.sh"

bash "$APP_DIR/deploy/smoke-remote.sh" https://autotests.ai
echo "Deploy OK: https://autotests.ai/stack/"
