#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$SCRIPT_DIR/rebuild-instance.sh" \
  --repo-dir "${DEV_REPO_DIR:-/root/.openclaw/workspace/Bridge/BridgeOneClub-dev}" \
  --service "${DEV_SERVICE_NAME:-bridgeoneclub-dev}" \
  --checkout-main \
  "$@"
