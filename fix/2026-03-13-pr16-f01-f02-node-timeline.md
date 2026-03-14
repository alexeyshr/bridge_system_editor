# Fix Note: PR-16 F01-F02 Node Timeline and Audit Surface

Date: 2026-03-13

## Scope Delivered

- Added system timeline server contract over `audit_events`.
- Added timeline tRPC endpoint under `bidding.lifecycle.timeline`.
- Expanded audit event recording for:
  - `system.create`
  - `system.update`
  - `node.sync`
  - `lifecycle.publish`
  - `lifecycle.draft_from_version`
  - `binding.upsert`
  - `binding.freeze`
  - `binding.remove`
  - `binding.freeze_tournament`
- Embedded "Recent activity" timeline panel inside lifecycle menu with category filter.

## Key Files

- `lib/server/system-timeline-service.ts`
- `lib/server/systems-service.ts`
- `lib/validation/systems.ts`
- `lib/trpc/routers/bidding.ts`
- `components/SystemLifecycleMenu.tsx`
- `tests/trpc/bidding-router.test.ts`
- `specs/014-node-change-timeline-and-audit-surface/*`

## Quality Gate

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test -- tests/trpc/bidding-router.test.ts` passed
- `npm run build` passed (with known external DB connectivity warnings on unrelated pages)

