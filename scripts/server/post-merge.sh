#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[post-merge] step 1/3: deploy prod from origin/main"
"$SCRIPT_DIR/deploy-prod.sh" "$@"

echo "[post-merge] step 2/3: sync dev to origin/main"
"$SCRIPT_DIR/sync-dev.sh" "$@"

echo "[post-merge] step 3/3: print status"
"$SCRIPT_DIR/bridge-status.sh"

echo "[post-merge] done"
