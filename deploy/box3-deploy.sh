#!/usr/bin/env bash
# Box3 deploy: GHCR pull + compose up (4 services). Does not build on the host.
# Never git reset --hard the teaching matrix clone (cells stay up).
# Run as qaguru on 212.92.101.15 — git/docker without sudo; nginx via sudo.
#
#   DEPLOY_TARGET=stage|prod IMAGE_TAG=<sha> GHCR_TOKEN=… bash deploy/box3-deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/autotests-ai-app}"
STACK_DIR="${STACK_DIR:-/home/autotests_ai_multistack/autotests-ai-multistack-app}"
DEPLOY_TARGET="${DEPLOY_TARGET:-prod}"
SKIP_CHECKOUT="${SKIP_CHECKOUT:-0}"
REFRESH_STACK_NGINX="${REFRESH_STACK_NGINX:-1}"
SYNC_NGINX="${SYNC_NGINX:-1}"
SMOKE="${SMOKE:-1}"
GHCR_USER="${GHCR_USER:-}"

if [[ "$(id -un)" == "root" ]]; then
  echo "Run as qaguru, not root (sudo only for nginx)." >&2
  exit 1
fi

case "$DEPLOY_TARGET" in
  prod)
    COMPOSE_PROJECT="${COMPOSE_PROJECT:-autotests-ai-app}"
    COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
    HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8081/api/health}"
    NGINX_SITE_NAME="${NGINX_SITE_NAME:-autotests.ai}"
    SMOKE_URL="${SMOKE_URL:-https://autotests.ai}"
    ;;
  stage)
    COMPOSE_PROJECT="${COMPOSE_PROJECT:-autotests-ai-app-stage}"
    COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-deploy/stage.env}"
    HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:18081/api/health}"
    NGINX_SITE_NAME="${NGINX_SITE_NAME:-stage.autotests.ai}"
    SMOKE_URL="${SMOKE_URL:-https://stage.autotests.ai}"
    ;;
  *)
    echo "DEPLOY_TARGET must be prod or stage (got: ${DEPLOY_TARGET})" >&2
    exit 1
    ;;
esac

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Missing clone at $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

if [[ "$SKIP_CHECKOUT" != "1" && -n "${IMAGE_TAG:-}" ]]; then
  echo "=== git checkout ${IMAGE_TAG} ==="
  if [[ "$(git rev-parse --is-shallow-repository)" == "true" ]]; then
    git fetch --depth=1 origin "$IMAGE_TAG"
  else
    git fetch origin "$IMAGE_TAG"
  fi
  if git cat-file -e "${IMAGE_TAG}^{commit}" 2>/dev/null; then
    git -c advice.detachedHead=false checkout --force "$IMAGE_TAG"
  else
    git -c advice.detachedHead=false checkout --force FETCH_HEAD
  fi
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "=== ghcr login ==="
  if [[ -z "$GHCR_USER" ]]; then
    echo "GHCR_TOKEN set but GHCR_USER is empty" >&2
    exit 1
  fi
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

COMPOSE=(docker compose --project-name "$COMPOSE_PROJECT" -f docker-compose.yml -f docker-compose.prod.yml)
if [[ -n "$COMPOSE_ENV_FILE" ]]; then
  COMPOSE+=(--env-file "$COMPOSE_ENV_FILE")
fi

# Empty IMAGE_TAG → compose default :latest
export IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "=== compose pull (${COMPOSE_PROJECT}, IMAGE_TAG=${IMAGE_TAG}) ==="
"${COMPOSE[@]}" pull

echo "=== compose up ==="
"${COMPOSE[@]}" up -d --remove-orphans

echo "=== wait ${HEALTH_URL} ==="
ok=0
for _ in $(seq 1 60); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" != "1" ]]; then
  echo "FAIL: ${HEALTH_URL} never became ready" >&2
  "${COMPOSE[@]}" ps >&2 || true
  "${COMPOSE[@]}" logs --tail=80 backend-java-spring gateway >&2 || true
  exit 1
fi
curl -fsS "$HEALTH_URL" | grep -q '"status":"ok"'
curl -fsS "${HEALTH_URL%/api/health}/stack/matrix.json" | grep -q '"backends"'

if [[ "$REFRESH_STACK_NGINX" == "1" ]]; then
  echo "=== teaching nginx fragments (no reset --hard) ==="
  if ! sudo -u autotests_ai_multistack test -d "$STACK_DIR/.git"; then
    echo "Missing autotests-ai-multistack-app at $STACK_DIR" >&2
    exit 1
  fi
  sudo -u autotests_ai_multistack bash -lc "
    set -euo pipefail
    cd \"$STACK_DIR\"
    git fetch origin
    git checkout origin/main -- deploy/nginx/
    python deploy/nginx/render_vhosts.py
  "
fi

if [[ "$SYNC_NGINX" == "1" ]]; then
  echo "=== nginx ${NGINX_SITE_NAME} ==="
  frag_prefix="$NGINX_SITE_NAME"
  sudo env \
    NGINX_SITE_NAME="$NGINX_SITE_NAME" \
    STACK_UPSTREAMS="$STACK_DIR/deploy/nginx/generated/${frag_prefix}-stack-upstreams.conf" \
    STACK_ROUTES="$STACK_DIR/deploy/nginx/generated/${frag_prefix}-stack-routes.conf" \
    NGINX_CONF_SRC="$APP_DIR/deploy/nginx/${NGINX_SITE_NAME}.conf" \
    bash "$APP_DIR/deploy/nginx/sync-nginx.sh"
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  docker logout ghcr.io >/dev/null 2>&1 || true
fi

if [[ "$SMOKE" == "1" ]]; then
  # Graceful nginx reload can still serve the previous 301 for a beat.
  sleep 2
  bash "$APP_DIR/deploy/smoke-remote.sh" "$SMOKE_URL"
fi

echo "Deploy OK: ${SMOKE_URL}/"
