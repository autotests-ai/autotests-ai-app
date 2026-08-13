#!/usr/bin/env bash
# Apply autotests.ai nginx vhost (requires passwordless sudo for this script path).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SRC="${NGINX_CONF_SRC:-${SCRIPT_DIR}/autotests.ai.conf}"
STACK_UPSTREAMS="${STACK_UPSTREAMS:-${STACK_UPSTREAMS_PATH:-}}"
STACK_ROUTES="${STACK_ROUTES:-${STACK_ROUTES_PATH:-}}"
SITE_NAME="${NGINX_SITE_NAME:-autotests.ai}"
SITE_PATH="/etc/nginx/sites-available/${SITE_NAME}"
TMP="/tmp/nginx-${SITE_NAME}.generated"
SSL_SNIPPET="/tmp/nginx-${SITE_NAME}.ssl-snippet"

if [[ ! -f "$CONF_SRC" ]]; then
  echo "Missing $CONF_SRC" >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  if sudo -n true 2>/dev/null; then
    exec sudo env NGINX_CONF_SRC="$CONF_SRC" NGINX_SITE_NAME="$SITE_NAME" "$0" "$@"
  fi
  echo "Run as root or with passwordless sudo for sync-nginx.sh" >&2
  exit 1
fi

cp "$CONF_SRC" "$TMP"

if [[ -z "$STACK_UPSTREAMS" ]]; then
  for candidate in \
    "/home/reference_app_copy/autotests-ai-multistack-app/deploy/nginx/generated/autotests.ai-stack-upstreams.conf" \
    "${SCRIPT_DIR}/generated/autotests.ai-stack-upstreams.conf"; do
    if [[ -f "$candidate" ]]; then
      STACK_UPSTREAMS="$candidate"
      break
    fi
  done
fi
if [[ -z "$STACK_ROUTES" ]]; then
  for candidate in \
    "/home/reference_app_copy/autotests-ai-multistack-app/deploy/nginx/generated/autotests.ai-stack-routes.conf" \
    "${SCRIPT_DIR}/generated/autotests.ai-stack-routes.conf"; do
    if [[ -f "$candidate" ]]; then
      STACK_ROUTES="$candidate"
      break
    fi
  done
fi
if [[ -z "$STACK_UPSTREAMS" || ! -f "$STACK_UPSTREAMS" ]]; then
  echo "Missing stack upstreams (run autotests-ai-multistack-app deploy/nginx/render_vhosts.py)" >&2
  exit 1
fi
if [[ -z "$STACK_ROUTES" || ! -f "$STACK_ROUTES" ]]; then
  echo "Missing stack routes (run autotests-ai-multistack-app deploy/nginx/render_vhosts.py)" >&2
  exit 1
fi
sed \
  -e "s|__STACK_UPSTREAMS_INCLUDE__|${STACK_UPSTREAMS}|" \
  -e "s|__STACK_ROUTES_INCLUDE__|${STACK_ROUTES}|" \
  "$TMP" >"${TMP}.stack"
mv "${TMP}.stack" "$TMP"

: >"$SSL_SNIPPET"
if [[ ! -s "$SSL_SNIPPET" ]]; then
  for domain in autotests.ai autotests.ai-0001 autotests.cloud-0001; do
    if [[ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ]]; then
      {
        echo "    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;"
        echo "    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;"
      } >>"$SSL_SNIPPET"
      break
    fi
  done
fi
if [[ ! -s "$SSL_SNIPPET" && -f "$SITE_PATH" ]]; then
  grep -E '^\s*ssl_certificate(_key)? ' "$SITE_PATH" | awk '!seen[$0]++' >>"$SSL_SNIPPET" || true
fi

if [[ -s "$SSL_SNIPPET" ]]; then
  awk -v sslfile="$SSL_SNIPPET" '
    /# ssl_certificate \.\.\.;/ {
      while ((getline line < sslfile) > 0) print line
      close(sslfile)
      next
    }
    { print }
  ' "$TMP" >"${TMP}.patched"
  mv "${TMP}.patched" "$TMP"
else
  echo "WARN: no ssl_certificate lines found for ${SITE_NAME}" >&2
fi

cp "$TMP" "$SITE_PATH"
ln -sf "$SITE_PATH" "/etc/nginx/sites-enabled/${SITE_NAME}"
nginx -t
systemctl reload nginx
echo "OK: nginx reloaded ($SITE_PATH)"
