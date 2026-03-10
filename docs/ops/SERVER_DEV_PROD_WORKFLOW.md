# Server Dev/Prod Workflow

Last updated: 2026-03-10

This document describes a safe server-first workflow with two separate runtime copies:

- `dev` copy for active development/testing,
- `prod` copy for stable public traffic.

## 1) Repository layout on server

Default paths used by scripts:

- `dev`: `/root/.openclaw/workspace/Bridge/BridgeOneClub-dev`
- `prod`: `/root/.openclaw/workspace/Bridge/BridgeOneClub-prod`

Both copies should have `origin` configured to the GitHub repo.

## 2) systemd services

Expected service names:

- `bridgeoneclub-dev` on port `3001`
- `bridgeoneclub` on port `3000`

Recommended host binding for both services:

- `Environment=HOSTNAME=127.0.0.1`

This keeps Next.js ports private and routes traffic through Nginx only.

## 3) Nginx routing

- `https://bridgeoneclub.ru` -> `127.0.0.1:3000` (prod)
- `https://dev.bridgeoneclub.ru` -> `127.0.0.1:3001` (dev)

## 4) Scripts in repository

Location: `scripts/server/`

- `rebuild-instance.sh` - generic rebuild/restart script
- `rebuild-dev.sh` - rebuild current branch in dev copy
- `sync-dev.sh` - fast-forward dev copy to `origin/main`, then rebuild
- `deploy-prod.sh` - fast-forward prod copy to `origin/main`, then rebuild
- `post-merge.sh` - one-command flow: `prod-deploy` then `dev-sync`
- `bridge-status.sh` - health/status report for dev/prod
- `install-shortcuts.sh` - installs shortcuts into `/usr/local/bin`

## 5) One-time setup on server

From either server clone:

```bash
cd /root/.openclaw/workspace/Bridge/BridgeOneClub-dev
sudo bash scripts/server/install-shortcuts.sh
```

After setup, these commands are globally available:

- `dev-rebuild`
- `dev-sync`
- `prod-deploy`
- `bridge-post-merge`
- `bridge-status`

## 6) Daily workflow

1. Work in `BridgeOneClub-dev` on a feature branch.
2. Rebuild and test dev runtime:
```bash
dev-rebuild
```
3. Commit and push branch to GitHub.
4. Open PR, pass checks, merge to `main`.
5. Run the mandatory post-merge command:
```bash
bridge-post-merge
```

This command does:
1. `prod-deploy` (prod = `origin/main`)
2. `dev-sync` (dev = `origin/main`)
3. `bridge-status` (prints drift warnings)

Use manual commands (`prod-deploy` / `dev-sync`) only when needed for debugging.

## 7) Anti-drift rules (must follow)

1. Do not commit directly on server clones.
2. After each merge to `main`, always run `bridge-post-merge`.
3. Keep feature work in PR branches, delete branch after merge.
4. Treat `bridge-status` warnings as blocking:
   - `branch is not main`
   - `branch is not aligned with origin/main`
   - `uncommitted server changes detected`

## 8) Why standalone assets copy is required

When running Next.js with:

```bash
node .next/standalone/server.js
```

you must also provide:

- `.next/standalone/.next/static`
- `.next/standalone/public`

Without that, HTML is returned but CSS/JS/images can fail with `404`.

`rebuild-instance.sh` handles this automatically.
