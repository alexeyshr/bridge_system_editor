# Plan: PR-9 Platform Core Hardening

Spec: `specs/005-platform-core-hardening/spec.md`  
Date: 2026-03-07  
Status: Draft

## Phase 1: Drizzle-Only Cutover (`BRI-44`)

Scope:
- inventory and remove Prisma runtime usage paths,
- finalize Drizzle repositories and migrations as single source,
- delete dual-driver flags after acceptance.

Deliverables:
- Prisma artifacts removed from runtime path.
- Drizzle-only adapters/services.
- migration notes and rollback procedure.

Verification:
- CRUD parity tests pass on Drizzle path only.
- `lint`, `typecheck`, `test`, `build` pass.

## Phase 2: Store Slices + Error Boundaries (`BRI-45`)

Scope:
- refactor monolithic Zustand store into internal slices,
- keep external selectors/actions API stable,
- add shell/panel error boundaries.

Deliverables:
- slice modules and composed store.
- boundary components and fallback UX.

Verification:
- baseline UI checks pass.
- no functional regression in tree/card/sections/smart views.

## Phase 3: Auth Migration + Rate Limits (`BRI-46`)

Scope:
- execute auth decision gate (Better Auth vs Auth.js v5),
- migrate to selected target with Telegram support,
- add rate limiting for auth/invite/search endpoints.

Deliverables:
- auth migration implementation.
- rate-limit middleware/policy and docs.

Verification:
- auth integration tests pass.
- abuse-protection checks for sensitive routes.

## Phase 4: Postgres Search + Indexing (`BRI-47`)

Scope:
- add FTS (`tsvector` + GIN),
- add JSONB indexes for hot filters,
- add benchmark script/report.

Deliverables:
- migration SQL and query integration.
- query benchmark note under `fix/`.

Verification:
- measurable improvement on representative dataset.

## Phase 5: SSE + schemaVersion Strategy (`BRI-48`)

Scope:
- add SSE notifications API route and client subscription flow,
- implement server-side schemaVersion migration pipeline.

Deliverables:
- SSE endpoint and client hook.
- migration registry (`vN -> vN+1`) with tests.

Verification:
- notification flow works across 2 browser sessions.
- schema migration tests pass for legacy payloads.

## Phase 6: Observability + Final QA (`BRI-49`)

Scope:
- integrate pino logs and Sentry,
- finalize QA matrix for PR-9 and record evidence.

Deliverables:
- logging/error tracking baseline.
- final acceptance report.

Verification:
- alerts/log traces visible for simulated failures.
- full CI quality gate passes.

## Rollback Strategy

- Keep rollout in isolated PR phases with feature flags only where necessary.
- Roll back by release unit if regression is detected.
- Avoid returning to dual-driver architecture after Phase 1 sign-off.
