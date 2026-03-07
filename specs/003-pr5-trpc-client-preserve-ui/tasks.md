# Tasks: PR-5 Client Migration to tRPC (Preserve Existing UI)

Spec: `specs/003-pr5-trpc-client-preserve-ui/spec.md`  
Plan: `specs/003-pr5-trpc-client-preserve-ui/plan.md`

## Task List

- [x] T501 (`BRI-22`) Add typed tRPC react client module (`lib/trpc/react.ts`)
- [x] T502 (`BRI-22`) Add `TrpcProvider` with `QueryClient` + `httpBatchLink` (`components/TrpcProvider.tsx`)
- [x] T503 (`BRI-22`) Wire `TrpcProvider` into root providers tree (`components/AuthProvider.tsx` or shell equivalent)
- [x] T504 (`BRI-23`) Add client sync adapter/hook for system load/save flow
- [x] T505 (`BRI-23`) Integrate store actions with tRPC sync adapter without breaking UI actions
- [x] T506 (`BRI-24`) Execute UI baseline checklist and record evidence
- [x] T507 (`BRI-24`) Run full verification (`lint`, `typecheck`, `test`, `build`)

## Definition of Done

- [x] All tasks complete
- [x] Linear issues `BRI-22`, `BRI-23`, `BRI-24` updated with evidence
- [x] Parent `BRI-21` moved to Done
