# SDD Structure Unification: `features/` -> `specs/`

Date: 2026-03-07

## What changed

- Migrated all active SDD packages from `features/` to `specs/`:
  - `specs/002-sdd-migration-backfill/`
  - `specs/003-pr5-trpc-client-preserve-ui/`
  - `specs/004-left-panel-evolution/`
- Removed legacy `features/` directory from active workflow.

## Process and tooling updates

- Updated CI `Spec Check` to require `specs/...` links:
  - `.github/workflows/ci.yml`
- Updated PR template example to `specs/...`:
  - `.github/pull_request_template.md`
- Updated CODEOWNERS to own `specs/` instead of `features/`:
  - `.github/CODEOWNERS`
- Updated SDD smoke test baseline path:
  - `tests/sdd-smoke.test.mjs`
- Updated repository documentation paths:
  - `readme.md`

## Result

- Single SDD source location is now `specs/`.
- Repo process is aligned with spec-kit style (`spec -> plan -> tasks` in `specs/`).
