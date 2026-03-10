# CURRENT_WORK

Updated: 2026-03-10 03:05 +03:00

## Active Context

- Main spec in progress: `specs/009-collaboration-discussions-and-sharing`
- Current branch: `codex/BRI-65-f01-access-control-matrix`
- Delivery mode: sequential implementation of F01 → F05 on one branch

## Phase Status

- F01: committed and pushed (`8776c5d`)
- F02: implemented (invite flows, states, rate-limit)
- F03: implemented (discussion threads/messages, mentions, notifications)
- F04: implemented (read-only publish links + public token access + audit)
- F05: implemented (structured logging baseline, docs, QA evidence, quality gate)

## Timeline (MSK, +03:00)

### F01 Access Control Matrix

- Start: 2026-03-09 02:46
- End: 2026-03-09 03:17
- Commit: `8776c5d`

### F02 Invite Flows

- Start: 2026-03-09 11:12
- End: 2026-03-09 11:31
- Result:
  - invite channels (`email`, `internal`, `telegram`) validated by contract
  - invite state transitions: `pending`, `accepted`, `revoked`, `expired`
  - invite revoke endpoint (`PATCH` + tRPC mutation)
  - abuse protection: create-invite throttling (`20/min` by `userId+systemId`)
  - editor permission enabled for invite management/search flow

### F03 Discussions + Mentions

- Start: 2026-03-09 11:31
- End: 2026-03-09 11:43
- Result:
  - thread scopes: `system` and `node`
  - message posting + thread listing APIs
  - mention parsing (`[user:<id>]`, `@telegram_username`)
  - mention dispatch to `discussion_mentions` + `notification_events`
  - explicit boundary: discussion path does not route through node mutation path

### F04 Read-Only Publish Links

- Start: 2026-03-09 11:43
- End: 2026-03-09 11:48
- Result:
  - create/revoke/rotate read-only links
  - protected management endpoints (owner capability)
  - public token access endpoint `GET /api/publish-links/[token]`
  - audit events for create/revoke/rotate/access

### F05 Acceptance + Documentation

- Start: 2026-03-09 11:48
- End: 2026-03-09 11:52
- Result:
  - structured JSON logger (`lib/server/logger.ts`) wired into sensitive routes
  - collaboration contracts doc: `docs/COLLABORATION_CONTRACTS.md`
  - QA/rollout evidence: `specs/009-collaboration-discussions-and-sharing/qa-acceptance-2026-03-09.md`
  - full quality gate completed successfully

## Quality Gate (latest run)

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅

## Immediate Next Step

- Stage F02–F05 changes.
- Commit and push.
- Open PR with spec links and QA evidence.

## Operational Update (VPS)

- Start: 2026-03-10 02:20
- End: 2026-03-10 03:05
- Result:
  - server deploy flow documented in repo (`docs/ops/SERVER_DEV_PROD_WORKFLOW.md`)
  - canonical server scripts added under `scripts/server/`
  - standalone assets copy fixed in deploy pipeline (prevents UI without CSS/JS)
  - fix note added in `fix/2026-03-10-standalone-assets-and-server-scripts.md`
