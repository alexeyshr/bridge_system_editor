# PR Draft: Server Post-Merge Sync Guardrails

## Title

`chore(ops): enforce post-merge prod/dev sync and drift warnings`

## Body

## Spec Link

- `specs/005-platform-core-hardening/spec.md`
- `specs/005-platform-core-hardening/pr-server-post-merge-guardrails.md`

## Scope

- Add mandatory post-merge script:
  - `scripts/server/post-merge.sh`
- Extend shortcut installer:
  - add `bridge-post-merge` command in `scripts/server/install-shortcuts.sh`
- Strengthen drift detection:
  - add branch/ahead/behind/dirty warnings in `scripts/server/bridge-status.sh`
- Update docs:
  - `docs/ops/SERVER_DEV_PROD_WORKFLOW.md`
  - `readme.md`
  - `CURRENT_WORK.md`
  - `fix/2026-03-10-server-drift-guardrails.md`

## Out of scope

- Auto-triggering deploy from GitHub webhook.
- Provisioning separate databases for dev/prod.
- Changing Nginx/systemd topology.

## Acceptance criteria

- `bridge-post-merge` exists and runs `prod-deploy -> dev-sync -> bridge-status`.
- `bridge-status` explicitly reports drift risk (non-main branch, ahead/behind, dirty tree).
- Workflow docs mark post-merge sync as mandatory.

## Test evidence

- `bash -n scripts/server/post-merge.sh`
- `bash -n scripts/server/bridge-status.sh`
- `bash -n scripts/server/install-shortcuts.sh`

## PR Link

- `https://github.com/alexeyshr/bridge_system_editor/pull/new/codex/server-workflow-guardrails-20260310`
