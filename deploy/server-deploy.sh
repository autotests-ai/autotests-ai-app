#!/usr/bin/env bash
# Manual prod wrapper. CD path is GitHub Actions (develop→stage, main→prod).
set -euo pipefail
export APP_DIR="${APP_DIR:-/opt/autotests-ai-app}"
export DEPLOY_TARGET="${DEPLOY_TARGET:-prod}"
exec bash "$APP_DIR/deploy/box3-deploy.sh"
