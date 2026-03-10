# Fix Note: server drift guardrails

Date: 2026-03-10  
Branch: `codex/server-workflow-guardrails-20260310`

## Problem

After merge to `main`, dev/prod copies on VPS could diverge because alignment steps were manual and easy to skip.

## Change

- Added `scripts/server/post-merge.sh` to run:
  1. `prod-deploy`
  2. `dev-sync`
  3. `bridge-status`
- Added shortcut install for `bridge-post-merge`.
- Extended `bridge-status.sh` with explicit drift warnings:
  - non-main branch
  - ahead/behind against `origin/main`
  - dirty worktree
- Updated `docs/ops/SERVER_DEV_PROD_WORKFLOW.md` with mandatory anti-drift rules.

## Verification

- Reviewed scripts syntax and command wiring.
- Confirmed shortcut mapping via `install-shortcuts.sh`.
- Confirmed workflow doc now marks `bridge-post-merge` as mandatory post-merge step.
