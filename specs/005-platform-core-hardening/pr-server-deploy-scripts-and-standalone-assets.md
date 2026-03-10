# PR Draft: Server Deploy Scripts + Standalone Assets Copy

## Title

`chore(ops): add server dev/prod deploy scripts and standalone assets copy`

## Body

## Spec Link

- `specs/005-platform-core-hardening/spec.md`
- `specs/005-platform-core-hardening/pr-server-deploy-scripts-and-standalone-assets.md`

## Scope

- Add canonical server scripts to repository:
  - `scripts/server/rebuild-instance.sh`
  - `scripts/server/rebuild-dev.sh`
  - `scripts/server/sync-dev.sh`
  - `scripts/server/deploy-prod.sh`
  - `scripts/server/bridge-status.sh`
  - `scripts/server/install-shortcuts.sh`
- Add server workflow doc:
  - `docs/ops/SERVER_DEV_PROD_WORKFLOW.md`
- Update `readme.md` with server deploy script section.
- Add fix note about standalone runtime static/public assets:
  - `fix/2026-03-10-standalone-assets-and-server-scripts.md`

## Out of scope

- CI/CD pipeline automation (GitHub Actions deploy job).
- Containerization changes.
- Runtime env split (`/etc/bridgeoneclub/env` for dev/prod) and DB split.

## Acceptance criteria

- Server scripts exist in repository and are executable.
- `rebuild-instance.sh` always copies `.next/static` and `public` into standalone runtime tree.
- `docs/ops/SERVER_DEV_PROD_WORKFLOW.md` describes full dev/prod workflow.
- `readme.md` references server deploy scripts and docs.

## Test evidence

- `bash -n` validation for all scripts in `scripts/server/`.
- Manual server validation:
  - `https://dev.bridgeoneclub.ru` returns styled UI (no missing CSS/JS).
  - `https://bridgeoneclub.ru` returns styled UI.
  - static/public assets return `200` on both domains.
