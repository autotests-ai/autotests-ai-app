#!/usr/bin/env bash
# Render (and optionally install) host vhost for autotests.ai or stage.autotests.ai.
# Board is inline in the vhost → landing gateway. Cells = *-stack-routes.conf only.
# NGINX_APPLY=0 writes /tmp/nginx-${SITE_NAME}.generated and exits (no install, no reload).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_NAME="${NGINX_SITE_NAME:-autotests.ai}"
APPLY="${NGINX_APPLY:-1}"

if [[ -n "${NGINX_CONF_SRC:-}" ]]; then
  CONF_SRC="$NGINX_CONF_SRC"
elif [[ "$SITE_NAME" == "stage.autotests.ai" ]]; then
  CONF_SRC="${SCRIPT_DIR}/stage.autotests.ai.conf"
else
  CONF_SRC="${SCRIPT_DIR}/autotests.ai.conf"
fi

STACK_UPSTREAMS="${STACK_UPSTREAMS:-${STACK_UPSTREAMS_PATH:-}}"
STACK_ROUTES="${STACK_ROUTES:-${STACK_ROUTES_PATH:-}}"
SITE_PATH="/etc/nginx/sites-available/${SITE_NAME}"
TMP="/tmp/nginx-${SITE_NAME}.generated"
SSL_SNIPPET="/tmp/nginx-${SITE_NAME}.ssl-snippet"
STACK_DIR_DEFAULT="/home/autotests_ai_multistack/autotests-ai-multistack-app/deploy/nginx/generated"

if [[ "$SITE_NAME" == "stage.autotests.ai" ]]; then
  FRAG_PREFIX="stage.autotests.ai"
  SSL_DOMAINS=(stage.autotests.ai)
else
  FRAG_PREFIX="autotests.ai"
  SSL_DOMAINS=(autotests.ai autotests.ai-0001)
fi

if [[ ! -f "$CONF_SRC" ]]; then
  echo "Missing $CONF_SRC" >&2
  exit 1
fi

if [[ "$APPLY" != "0" && "$(id -u)" -ne 0 ]]; then
  if sudo -n true 2>/dev/null; then
    exec sudo env \
      NGINX_CONF_SRC="$CONF_SRC" \
      NGINX_SITE_NAME="$SITE_NAME" \
      NGINX_APPLY="$APPLY" \
      STACK_UPSTREAMS="$STACK_UPSTREAMS" \
      STACK_ROUTES="$STACK_ROUTES" \
      "$0" "$@"
  fi
  echo "Run as root or with passwordless sudo, or NGINX_APPLY=0 to render /tmp only" >&2
  exit 1
fi

cp "$CONF_SRC" "$TMP"

if [[ -z "$STACK_UPSTREAMS" ]]; then
  for candidate in \
    "${STACK_DIR_DEFAULT}/${FRAG_PREFIX}-stack-upstreams.conf" \
    "${SCRIPT_DIR}/generated/${FRAG_PREFIX}-stack-upstreams.conf"; do
    if [[ -f "$candidate" ]]; then
      STACK_UPSTREAMS="$candidate"
      break
    fi
  done
fi
if [[ -z "$STACK_ROUTES" ]]; then
  for candidate in \
    "${STACK_DIR_DEFAULT}/${FRAG_PREFIX}-stack-routes.conf" \
    "${SCRIPT_DIR}/generated/${FRAG_PREFIX}-stack-routes.conf"; do
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
  for domain in "${SSL_DOMAINS[@]}"; do
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

if [[ "$APPLY" == "0" ]]; then
  echo "OK: rendered $TMP (NGINX_APPLY=0, not installed)"
  exit 0
fi

cp "$TMP" "$SITE_PATH"
ln -sf "$SITE_PATH" "/etc/nginx/sites-enabled/${SITE_NAME}"
nginx -t
systemctl reload nginx
echo "OK: nginx reloaded ($SITE_PATH)"
