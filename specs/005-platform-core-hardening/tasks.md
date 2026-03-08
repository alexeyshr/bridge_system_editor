# Tasks: PR-9 Platform Core Hardening

Spec: `specs/005-platform-core-hardening/spec.md`  
Plan: `specs/005-platform-core-hardening/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F06`

## F01 Drizzle-Only Cutover (`BRI-44`)

- [x] T901 Audit and map all remaining Prisma runtime imports/usages.
- [x] T902 Remove Prisma runtime path from server services/adapters.
- [x] T903 Remove Prisma-specific env/scripts/docs and update onboarding.
- [x] T904 [P] Add/adjust Drizzle-only parity tests for critical endpoints.
- [x] T905 Add rollback notes for cutover in `fix/`.

## F02 Store Slices + Error Boundaries (`BRI-45`)

- [ ] T910 Introduce slice modules (`nodes`, `sections`, `editorUi`, `sync`) and compose root store.
- [ ] T911 Keep compatibility selectors/actions to avoid broad UI rewrites.
- [ ] T912 Add React Error Boundaries for shell, left panel, center panel, right panel.
- [ ] T913 [P] Add tests for cross-slice actions and regression-sensitive flows.
- [ ] T914 Run UI baseline and attach evidence.

## F03 Auth Migration + Rate Limits (`BRI-46`)

- [ ] T920 Create auth compatibility spike (Better Auth vs Auth.js v5) with recommendation note.
- [ ] T921 Implement selected auth migration and session compatibility.
- [ ] T922 Verify Telegram login/linking behavior in migrated auth stack.
- [ ] T923 Add rate limiting middleware for auth/invite/user-search endpoints.
- [ ] T924 [P] Add integration tests for auth providers and rate-limit behavior.

## F04 PostgreSQL Search + Indexing (`BRI-47`)

- [ ] T930 Add FTS columns/indexes and query integration for editor search.
- [ ] T931 Add JSONB indexes for known hot query paths.
- [ ] T932 [P] Add benchmark script and before/after measurements.
- [ ] T933 Document search/index strategy and thresholds for external engine reconsideration.

## F05 SSE + schemaVersion Strategy (`BRI-48`)

- [ ] T940 Implement SSE endpoint for collaboration notifications.
- [ ] T941 Implement client subscription hook and update banner UX.
- [ ] T942 Implement schemaVersion migration registry (`vN -> vN+1`).
- [ ] T943 [P] Add tests for migration correctness and SSE event delivery.
- [ ] T944 Document event contracts and migration policy.

## F06 Observability + Final QA (`BRI-49`)

- [ ] T950 Integrate structured logging (`pino`) in server routes/services.
- [ ] T951 Integrate Sentry in client/server runtime paths.
- [ ] T952 Define minimal alerting/error budget checklist.
- [ ] T953 [P] Run full quality gate (`lint`, `typecheck`, `test`, `build`, `ui:baseline`).
- [ ] T954 Update docs (`readme.md`, `fix/`, `specs/005/*`) and prepare merge handoff.
