# 2026-03-10: Standalone assets and server scripts

## Problem

After switching to Next.js standalone runtime (`node .next/standalone/server.js`) on VPS, UI rendered as plain HTML without styles/interactivity.

## Root Cause

Standalone runtime did not include static/public assets:

- `.next/static`
- `public/`

As a result, CSS/JS/image requests returned `404`.

## Fix

Added server scripts to repository under `scripts/server/` and embedded mandatory asset copy step into rebuild flow:

- copy `.next/static` -> `.next/standalone/.next/static`
- copy `public` -> `.next/standalone/public`

Also documented full dev/prod server workflow:

- `docs/ops/SERVER_DEV_PROD_WORKFLOW.md`

## Prevention

Use only repository scripts (`rebuild-dev`, `dev-sync`, `prod-deploy`) for rebuild/deploy.
Do not run standalone deploy manually without asset copy step.
