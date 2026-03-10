#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root (required to write /usr/local/bin)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_cmd() {
  local cmd_name="$1"
  local target_script="$2"
  local out="/usr/local/bin/${cmd_name}"

  cat > "$out" <<EOF
#!/usr/bin/env bash
exec "$target_script" "\$@"
EOF

  chmod 755 "$out"
  echo "installed: $out -> $target_script"
}

install_cmd "dev-rebuild" "$SCRIPT_DIR/rebuild-dev.sh"
install_cmd "dev-sync" "$SCRIPT_DIR/sync-dev.sh"
install_cmd "prod-deploy" "$SCRIPT_DIR/deploy-prod.sh"
install_cmd "bridge-post-merge" "$SCRIPT_DIR/post-merge.sh"
install_cmd "bridge-status" "$SCRIPT_DIR/bridge-status.sh"

echo "All shortcuts are installed in /usr/local/bin"
