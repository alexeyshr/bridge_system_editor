# PR-5 Phase 1: tRPC client provider foundation

Date: 2026-03-07

## Implemented

- Added typed React tRPC client:
  - `lib/trpc/react.ts`
- Added app-level provider for tRPC + React Query:
  - `components/TrpcProvider.tsx`
- Wired provider into root providers tree:
  - `components/AuthProvider.tsx`

## Important correction

- tRPC v11 requires `transformer` on `httpBatchLink`, not on `createClient`.
- Updated provider accordingly to avoid type/runtime mismatch.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
