#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  rebuild-instance.sh --repo-dir <path> --service <name> [--checkout-main]

Options:
  --repo-dir <path>    Repository directory with package.json
  --service <name>     systemd service name to restart
  --checkout-main      Fetch + checkout main + fast-forward pull before build
  -h, --help           Show this help

Environment:
  PACKAGE_MANAGER=auto|pnpm|npm   (default: auto)
EOF
}

REPO_DIR=""
SERVICE=""
CHECKOUT_MAIN=0
PACKAGE_MANAGER="${PACKAGE_MANAGER:-auto}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-dir)
      REPO_DIR="${2:-}"
      shift 2
      ;;
    --service)
      SERVICE="${2:-}"
      shift 2
      ;;
    --checkout-main)
      CHECKOUT_MAIN=1
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$REPO_DIR" || -z "$SERVICE" ]]; then
  echo "Error: --repo-dir and --service are required." >&2
  usage
  exit 1
fi

if [[ ! -d "$REPO_DIR" ]]; then
  echo "Error: repo dir does not exist: $REPO_DIR" >&2
  exit 1
fi

cd "$REPO_DIR"
echo "[rebuild-instance] repo: $(pwd)"

if [[ "$CHECKOUT_MAIN" == "1" ]]; then
  git fetch origin --prune
  git checkout main
  git pull --ff-only origin main
else
  git status --short --branch
fi

run_install_and_build() {
  case "$PACKAGE_MANAGER" in
    pnpm)
      pnpm install --frozen-lockfile
      pnpm build
      ;;
    npm)
      npm ci
      npm run build
      ;;
    auto)
      if command -v pnpm >/dev/null 2>&1; then
        pnpm install --frozen-lockfile
        pnpm build
      else
        npm ci
        npm run build
      fi
      ;;
    *)
      echo "Error: invalid PACKAGE_MANAGER value: $PACKAGE_MANAGER" >&2
      exit 1
      ;;
  esac
}

copy_standalone_assets() {
  # Next.js standalone runtime does not include these by default.
  mkdir -p .next/standalone/.next
  rm -rf .next/standalone/.next/static
  cp -a .next/static .next/standalone/.next/static

  if [[ -d public ]]; then
    rm -rf .next/standalone/public
    cp -a public .next/standalone/public
  fi
}

run_install_and_build
copy_standalone_assets

systemctl daemon-reload
systemctl restart "$SERVICE"
systemctl --no-pager --full status "$SERVICE" | sed -n '1,20p'

echo "[rebuild-instance] done"
