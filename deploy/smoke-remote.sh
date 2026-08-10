#!/usr/bin/env bash
# Post-deploy smoke for autotests.ai (strict TLS — no curl -k).
set -euo pipefail

BASE_URL="${1:-https://autotests.ai}"
BASE_URL="${BASE_URL%/}"

echo "=== TLS + GET ${BASE_URL}/ ==="
code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/")"
echo "HTTP ${code}"
[[ "$code" == "200" ]] || { echo "FAIL: expected 200" >&2; exit 1; }

echo "=== GET ${BASE_URL}/api/terminal ==="
body="$(curl -fsSL "${BASE_URL}/api/terminal")"
echo "$body" | grep -q postgresql || { echo "FAIL: missing postgresql in response" >&2; exit 1; }

echo "=== GET ${BASE_URL}/stack/ ==="
stack_code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/stack/")"
echo "HTTP ${stack_code}"
[[ "$stack_code" == "200" ]] || { echo "FAIL: expected 200 for /stack/" >&2; exit 1; }

echo "=== GET ${BASE_URL}/stack/matrix.json ==="
curl -fsSL "${BASE_URL}/stack/matrix.json" | grep -q '"backends"' || {
  echo "FAIL: matrix.json missing backends" >&2
  exit 1
}

DEFAULT_BE="${STACK_SMOKE_BACKEND:-backend-java-spring}"
DEFAULT_FE="${STACK_SMOKE_FRONTEND:-frontend-typescript-react}"
STACK_PRODUCT="${BASE_URL}/stack/${DEFAULT_BE}/${DEFAULT_FE}/"
echo "=== GET ${STACK_PRODUCT} ==="
product_code="$(curl -s -o /dev/null -w '%{http_code}' "${STACK_PRODUCT}")"
echo "HTTP ${product_code}"
[[ "$product_code" == "200" ]] || { echo "FAIL: expected 200 for stack product" >&2; exit 1; }

API_URL="${BASE_URL}/stack/${DEFAULT_BE}/api/health"
echo "=== GET ${API_URL} ==="
curl -fsSL "${API_URL}" | grep -qiE 'ok|UP|healthy' || {
  echo "FAIL: stack API health check" >&2
  exit 1
}

LEGACY="${BASE_URL}/${DEFAULT_BE}/${DEFAULT_FE}/"
echo "=== legacy 301 ${LEGACY} → /stack/… ==="
legacy_loc="$(curl -s -o /dev/null -w '%{redirect_url}' "${LEGACY}")"
echo "redirect: ${legacy_loc}"
[[ "$legacy_loc" == "${STACK_PRODUCT}" ]] || [[ "$legacy_loc" == "${STACK_PRODUCT%/}/" ]] || {
  echo "FAIL: legacy path should 301 to ${STACK_PRODUCT}" >&2
  exit 1
}

echo "Smoke OK: ${BASE_URL}"
