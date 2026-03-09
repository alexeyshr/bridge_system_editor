# QA Acceptance: Spec 009

Date: 2026-03-09  
Spec: `specs/009-collaboration-discussions-and-sharing/spec.md`

## Coverage Summary

- F01: Role capability matrix + endpoint guards
- F02: Invite channels + state transitions + rate limiting
- F03: Discussion threads/messages + mention dispatch + note boundary
- F04: Read-only publish links + access checks + audit events
- F05: Structured logging + docs + quality gate

## Quality Gate Evidence

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅

## Key Automated Tests

- `tests/collaboration-policy.test.ts`
  - role matrix behavior
- `tests/invites-rate-limit.test.ts`
  - invite channel validation + abuse throttling behavior
- `tests/discussions-mentions.test.ts`
  - mention parsing
- `tests/trpc/bidding-router.test.ts`
  - invite/threads/links route behaviors
  - permission and rate-limit mapping
  - discussion does not call node mutation path

## Rollout Notes

- Run DB migration before rollout:
  - `npm run db:migrate`
- New persistence objects introduced:
  - `discussion_threads`, `discussion_messages`, `discussion_mentions`
  - `notification_events`
  - `read_only_publish_links`
  - `audit_events`
  - `share_invites.revoked_at`
- Public read-only endpoint:
  - `GET /api/publish-links/[token]`
- Operational note:
  - current rate limiter is process-local (in-memory); for multi-instance deployment replace with shared store.
