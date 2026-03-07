# ADR-0002: Drizzle + tRPC as Default Data/API Path

- Status: Accepted
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: data, api, migration

## Context

Initial iterations used Prisma and local-store-centric flows.  
Target portal stack is defined as:

- Next.js 15 + React 19 + TypeScript
- tRPC for typed API contracts
- Drizzle ORM + PostgreSQL for persistence
- Redis, Meilisearch, MinIO/S3 for supporting capabilities

Migration is already in progress and must preserve editor UX.

## Decision

- Set Drizzle as the default persistence direction for new backend work.
- Set tRPC as the default application API layer.
- Keep temporary dual-driver/dual-path compatibility only during migration windows with explicit flags and parity checks.

## Consequences

### Positive

- Aligns implementation with the long-term platform stack.
- Improves type continuity from database to API to client.
- Reduces future rewrite risk when embedding bidding module into full portal.

### Negative

- Requires short-term maintenance of migration compatibility layers.
- Requires stronger test discipline around parity and regression checks.

## Alternatives Considered

1. Stay Prisma-first long term:
   - rejected to avoid divergence from target architecture.
2. Move to REST-only API:
   - rejected because typed end-to-end contracts are preferred for this codebase.

## Impacted Specs

- `specs/001-authentication-and-database/spec.md`
- `specs/002-sdd-migration-backfill/spec.md`
- `specs/003-pr5-trpc-client-preserve-ui/spec.md`

## Related Documents

- `docs/c4/c2-container.mmd`
- `docs/c4/c3-components-api.mmd`
- `docs/c4/c4-code-guidelines.md`
