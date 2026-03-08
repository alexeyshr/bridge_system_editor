# Platform Core Hardening Plan (specs/005)

Scope: transition from completed bidding editor module to portal-ready, multi-user, low-ops architecture for 15-20K users.

## Architecture References

- ADR: `docs/adr/ADR-0003-drizzle-only-cutover-and-prisma-removal.md`
- ADR: `docs/adr/ADR-0004-zustand-slice-architecture.md`
- ADR: `docs/adr/ADR-0005-auth-stack-migration-direction.md`
- ADR: `docs/adr/ADR-0006-postgres-search-and-indexing-first.md`
- ADR: `docs/adr/ADR-0007-sse-for-collaboration-notifications.md`
- ADR: `docs/adr/ADR-0008-observability-and-protection-baseline.md`
- C4: `docs/c4/c2-container.mmd`
- C4: `docs/c4/c3-components-api.mmd`
- C4: `docs/c4/c3-components-webapp.mmd`

## Linear Scope

- Parent: `BRI-43` (PR-9)
- Mapping: `specs/005-platform-core-hardening/linear-mapping.md`

## Delivery Order

1. `spec.md` - scope and acceptance for PR-9.
2. `plan.md` - phased rollout and rollback boundaries.
3. `tasks.md` - implementation checklist and QA gates.
4. `linear-mapping.md` - issue mapping by phase.

## Locked Decisions (Draft)

- No Redis / Meilisearch / queue / Kubernetes in this phase.
- Drizzle-only path after cutover window.
- PostgreSQL FTS + indexes as default search strategy.
- SSE as collaboration notification transport.
- Zustand slice refactor + React Error Boundaries.

## Board

- [x] F01 Drizzle-only cutover and Prisma removal
- [ ] F02 Zustand slice refactor and Error Boundaries
- [ ] F03 Auth migration and endpoint rate limiting
- [ ] F04 PostgreSQL FTS and JSONB indexing
- [ ] F05 SSE notifications and schemaVersion migration framework
- [ ] F06 Observability baseline and final QA gate
