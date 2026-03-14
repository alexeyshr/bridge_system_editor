# Fix Note: PR-16 F03-F06 Timeline Polish, Attribution, and Window Controls

Date: 2026-03-13

## Scope Delivered

- Completed remaining PR-16 phases:
  - F03: node-level diff visibility polish.
  - F04: actor attribution fallback and optional profile links.
  - F05: timeline retention/window controls and cursor-ready API shape.
  - F06: quality gate and roadmap/spec updates.
- Added richer node sync audit payload hints:
  - `upsertedSequencesMore`
  - `removedSequencesMore`
- Extended timeline server contract with:
  - `windowDays`
  - `cursor`
  - `pageInfo` (`hasMore`, `nextCursor`, `limit`, `windowDays`)
- Updated lifecycle menu UI with:
  - compare-section jump chips for changed sequences,
  - actor profile link rendering (when available),
  - window selector (`7/30/90/180 days`),
  - `Load more` cursor pagination in recent activity.

## Key Files

- `lib/server/system-timeline-service.ts`
- `lib/server/systems-service.ts`
- `lib/validation/systems.ts`
- `lib/trpc/routers/bidding.ts`
- `components/SystemLifecycleMenu.tsx`
- `tests/trpc/bidding-router.test.ts`
- `specs/014-node-change-timeline-and-audit-surface/*`
- `docs/ROADMAP.md`
- `docs/TRIAGE.md`

## Quality Gate

- `npm run test -- tests/trpc/bidding-router.test.ts` passed
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run build` passed (with known external DB connectivity warnings on unrelated pages)
