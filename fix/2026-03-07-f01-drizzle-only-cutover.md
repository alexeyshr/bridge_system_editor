# F01: Drizzle-Only Cutover and Prisma Removal

Date: 2026-03-07  
Spec: `specs/005-platform-core-hardening/spec.md`  
Phase: `F01` (`BRI-44`)

## What Changed

1. Removed Prisma runtime path:
- deleted `lib/db/prisma.ts`
- deleted `lib/server/drivers/prisma-systems-driver.ts`
- deleted `lib/server/drivers/prisma-invites-driver.ts`
- `lib/server/systems-service.ts` and `lib/server/invite-service.ts` now call Drizzle drivers directly

2. Migrated remaining Prisma call sites to Drizzle:
- `app/api/auth/register/route.ts`
- `app/api/users/search/route.ts`
- `lib/auth/config.ts`
- `lib/auth/linking.ts`
- `lib/server/auth-guard.ts`
- `lib/trpc/routers/bidding.ts` (`users.search` default dependency)
- introduced shared Drizzle user search service: `lib/server/users-service.ts`

3. Updated tests and onboarding:
- replaced driver parity test with Drizzle-only integration checks in `tests/parity/systems-drivers-parity.test.ts`
- removed Prisma scripts/deps from `package.json` and lockfile
- removed `prisma/schema.prisma`
- updated `.env.example` and `readme.md` to remove Prisma/dual-write instructions

4. Finalized architecture decision:
- `docs/adr/ADR-0003-drizzle-only-cutover-and-prisma-removal.md` status set to `Accepted`

## Verification

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅

## Rollback Notes

Release-level rollback only:
1. Revert this PR commit range.
2. Reinstall removed deps (`@prisma/client`, `prisma`) from prior lockfile state.
3. Restore removed runtime files (`lib/db/prisma.ts`, Prisma drivers, Prisma-based call sites).

No dual-driver rollback path is retained in active code.
