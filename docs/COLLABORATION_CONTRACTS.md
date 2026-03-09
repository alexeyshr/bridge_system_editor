# Collaboration Contracts

Updated: 2026-03-09

## Role Capabilities

Source of truth: `lib/server/collaboration-policy.ts`

- `owner`
  - full access (`system`, `lifecycle`, `shares`, `invites`, `users.search`, `discussions`, `links`)
- `editor`
  - can edit and publish system
  - can create/manage invites
  - can search users for invite flow
  - can read/write discussions
  - cannot manage shares
  - cannot manage read-only links
- `reviewer`
  - read system, read/write discussions
  - cannot mutate bidding tree
  - cannot publish/share/invite/search users/manage links
- `viewer`
  - read system + read discussions
  - cannot write discussions or mutate system
- `none`
  - no access

## Invite Contract

Validation: `lib/validation/invites.ts`

- Channels:
  - `email` requires `targetEmail`
  - `internal` requires `targetUserId`
  - `telegram` requires `targetTelegramUsername`
- Roles supported in invite payload:
  - `viewer`, `reviewer`, `editor`
- States:
  - `pending`, `accepted`, `revoked`, `expired`
- State transitions:
  - `pending -> accepted` on successful token accept
  - `pending -> revoked` via owner/editor revoke
  - `pending -> expired` when `expiresAt` is in the past

## Discussion Contract

Validation: `lib/validation/discussions.ts`

- Thread scopes:
  - `system` (whole system context)
  - `node` (requires `scopeNodeId`)
- Messages are stored in dedicated discussion tables and do not mutate bidding node meaning payload.
- Mentions supported:
  - `[user:<userId>]`
  - `@telegram_username`
- Mention dispatch creates:
  - `discussion_mentions` rows
  - `notification_events` rows (`type=mention`)

## Read-Only Publish Link Contract

Validation: `lib/validation/publish-links.ts`

- Link lifecycle:
  - `active` -> `revoked`
  - token `rotate` allowed only for active links
- Public access endpoint:
  - `GET /api/publish-links/[token]`
  - returns published snapshot for active, non-expired links
  - returns `410` for revoked/expired links

## Protection Baseline

- Rate limiting:
  - invite create: `20/min` per `userId + systemId`
  - discussion post: `40/min` per `userId + systemId`
- Sensitive action telemetry:
  - JSON logs via `lib/server/logger.ts`
  - audit rows via `audit_events`
