#!/usr/bin/env bash
set -euo pipefail

DEV_DIR="${DEV_REPO_DIR:-/root/.openclaw/workspace/Bridge/BridgeOneClub-dev}"
PROD_DIR="${PROD_REPO_DIR:-/root/.openclaw/workspace/Bridge/BridgeOneClub-prod}"
DEV_SERVICE="${DEV_SERVICE_NAME:-bridgeoneclub-dev}"
PROD_SERVICE="${PROD_SERVICE_NAME:-bridgeoneclub}"
DEV_URL="${DEV_URL:-http://127.0.0.1:3001}"
PROD_URL="${PROD_URL:-http://127.0.0.1:3000}"
PUBLIC_URL="${PUBLIC_URL:-https://bridgeoneclub.ru}"

print_repo() {
  local name="$1"
  local dir="$2"
  echo "=== $name ==="

  if [[ ! -d "$dir/.git" ]]; then
    echo "repo: missing ($dir)"
    echo
    return
  fi

  cd "$dir"
  local branch head remote_head
  branch="$(git branch --show-current 2>/dev/null || echo '?')"
  head="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
  git fetch origin --prune >/dev/null 2>&1 || true
  remote_head="$(git rev-parse --short origin/main 2>/dev/null || echo '?')"

  echo "path: $dir"
  echo "branch: $branch"
  echo "head: $head"
  echo "origin/main: $remote_head"
  git status --short --branch | sed -n '1,6p'
  echo
}

print_service() {
  local svc="$1"
  echo "=== service: $svc ==="
  echo -n "active: "
  systemctl is-active "$svc" || true
  echo -n "enabled: "
  systemctl is-enabled "$svc" || true
  systemctl --no-pager --full status "$svc" | sed -n '1,8p'
  echo
}

print_http() {
  local label="$1"
  local url="$2"
  echo "=== http: $label ==="
  if curl -k -I -sS "$url" >/tmp/.bridge_status_http 2>/tmp/.bridge_status_http_err; then
    sed -n '1,5p' /tmp/.bridge_status_http
  else
    echo "request failed"
    sed -n '1,5p' /tmp/.bridge_status_http_err || true
  fi
  echo
}

echo "Bridge status @ $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo

print_repo "DEV" "$DEV_DIR"
print_repo "PROD" "$PROD_DIR"

print_service "$DEV_SERVICE"
print_service "$PROD_SERVICE"

print_http "dev ($DEV_URL)" "$DEV_URL"
print_http "prod ($PROD_URL)" "$PROD_URL"
print_http "public ($PUBLIC_URL)" "$PUBLIC_URL"
