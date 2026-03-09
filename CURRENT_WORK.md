# CURRENT_WORK

Updated: 2026-03-09 03:17 +03:00

## Active Context

- Main spec in progress: `specs/009-collaboration-discussions-and-sharing`
- Current branch: `codex/BRI-65-f01-access-control-matrix`
- Linear issue: `BRI-65` (F01 Access Control Matrix)
- Phase status:
  - F01: implemented on branch (pending commit/PR/merge)
  - F02: next
  - F03: pending
  - F04: pending
  - F05: pending

## Timeline (MSK, +03:00)

### Spec 009 / F01 Access Control Matrix

- Start: 2026-03-09 02:46
- End: 2026-03-09 03:17
- Branch: `codex/BRI-65-f01-access-control-matrix`
- Result:
  - Added collaboration capability matrix (`owner/editor/reviewer/viewer/none`) in `lib/server/collaboration-policy.ts`.
  - Added server-side guards for collaboration endpoints in TRPC router (`shares`, `invites`, `users.search`).
  - Extended `users.search` input contract to require `systemId`.
  - Added route-level guard enforcement for REST collaboration endpoints:
    - `app/api/systems/[systemId]/shares/route.ts`
    - `app/api/systems/[systemId]/invites/route.ts`
    - `app/api/users/search/route.ts`
  - Added reviewer support to access/type/contracts:
    - `lib/server/drivers/types.ts`
    - `lib/server/drivers/drizzle-systems-driver.ts`
    - `lib/server/auth-guard.ts`
    - `lib/domain/bidding/contracts.ts`
    - `lib/validation/invites.ts`
    - `lib/validation/systems.ts`
    - `lib/db/drizzle/schema.ts`
  - Added DB migration for `share_role` enum:
    - `drizzle/0002_ambiguous_vertigo.sql`
    - `drizzle/meta/0002_snapshot.json`
    - `drizzle/meta/_journal.json`
  - Added tests:
    - `tests/collaboration-policy.test.ts`
    - extended `tests/trpc/bidding-router.test.ts` for guard checks and reviewer role
  - Quality gate passed locally:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test`
    - `npm run build`

## Process Contract (strict)

For each phase/subphase:

1. Set/create Linear issue and move to `In Progress`.
2. Create branch `codex/<issue-key>-<short-topic>`.
3. Implement + tests.
4. Run quality gate (`lint`, `typecheck`, `test`, `build`).
5. Open PR with spec link and acceptance evidence.
6. Move Linear issue to `Done` only after merge to `main`.
7. Update this file (`CURRENT_WORK.md`) with start/end/result.

## Immediate Next Step

- Finalize F01 delivery package:
  - stage only F01 files,
  - commit,
  - push branch,
  - open PR with spec link,
  - attach test evidence in Linear `BRI-65`.
