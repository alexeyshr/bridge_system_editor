# Plan: PR-5 Client Migration to tRPC (Preserve Existing UI)

Spec: `specs/003-pr5-trpc-client-preserve-ui/spec.md`  
Date: 2026-03-07  
Status: In Progress

## Phase 1: Provider and Client Foundation (`BRI-22`)

Scope:
- Create typed tRPC React client (`createTRPCReact<AppRouter>`).
- Create app-level provider with `QueryClientProvider` and `trpc.Provider`.
- Mount provider in app shell with existing auth provider.

Deliverables:
- `lib/trpc/react.ts`
- `components/TrpcProvider.tsx`
- `components/AuthProvider.tsx` update (or equivalent shell provider wiring)

Verification:
- app renders without hydration/runtime errors
- `lint`, `typecheck`, `test`, `build` pass

## Phase 2: Store Sync Migration (`BRI-23`)

Scope:
- Introduce sync adapter/hook from store actions to tRPC operations.
- Replace local-only persistence path for system data with server-backed path.
- Keep local draft only as fallback queue where required.

Deliverables:
- `hooks/useSystemSync.ts` (or equivalent)
- `store/useBiddingStore.ts` integration points
- minimal client facade for data operations

Verification:
- CRUD actions visible in UI continue to function
- tRPC requests observed for load/sync paths

## Phase 3: UI Regression Validation (`BRI-24`)

Scope:
- Run checklist against current UI behavior.
- Capture manual evidence and known deviations (if any).

Deliverables:
- updated notes under `tests/ui-baseline/` and/or `fix/`

Verification:
- checklist complete
- no blocker regressions

## Rollback Strategy

- Keep migration changes isolated behind provider/adapters.
- If regression appears, rollback by reverting PR-5 commits (no DB schema rollback required in this phase).
