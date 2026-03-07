# PR-5 Phase 2: Store sync migration to tRPC

Date: 2026-03-07

## Implemented

- Added client sync hook:
  - `hooks/useSystemSync.ts`
- Wired sync hook into app runtime:
  - `app/page.tsx`
- Extended store with server sync state + actions:
  - `store/useBiddingStore.ts`
  - `activeSystemId`, `activeSystemRevision`
  - `isServerSyncing`, `serverSyncError`, `lastServerSavedAt`
  - `setActiveSystem`, `hydrateFromRemoteSystem`, server sync markers
- Updated top status line to reflect server sync state for authenticated users:
  - `components/TopBar.tsx`

## Behavior

- Authenticated users:
  - systems list is loaded via tRPC
  - active system is selected/created automatically
  - local edits are debounced and synced via `bidding.nodes.sync`
  - conflicts trigger automatic refetch of latest server state
- Unauthenticated users:
  - current local draft behavior remains available

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
