# Plan: Bidding Module Migration Backfill (PR-1..PR-4)

Spec: `specs/002-sdd-migration-backfill/spec.md`  
Date: 2026-03-07  
Status: Executed (Backfill)

## Implementation Summary

Backfill covers four already delivered migration increments and documents them as explicit SDD phases.

## Phase A: PR-1 Baseline and Contracts

Scope:
- Freeze UI baseline checklist.
- Introduce domain-level contracts.
- Add migration runtime flags.

Deliverables:
- `tests/ui-baseline/bidding-module-regression.md`
- `tests/ui-baseline/screenshots/.gitkeep`
- `lib/domain/bidding/contracts.ts`
- `lib/config/feature-flags.ts`
- `.env.example` updates

Verification:
- file existence and consistency checks
- lint/typecheck/build pass

## Phase B: PR-2 Drizzle Foundation

Scope:
- Add Drizzle schema and migration toolchain.
- Add DB health and seed scripts.
- Keep rollback path explicit.

Deliverables:
- `drizzle.config.ts`
- `lib/db/drizzle/schema.ts`
- `lib/db/drizzle/client.ts`
- `drizzle/*.sql`
- `drizzle/rollback/*.down.sql`
- `scripts/db-healthcheck.ts`
- `scripts/db-seed.ts`
- package scripts `db:*`

Verification:
- `npm run db:generate`
- lint/typecheck/test/build pass

## Phase C: PR-3 tRPC API Layer

Scope:
- Add protected tRPC context/init/root.
- Add bidding router with service mapping.
- Add route handler and baseline router tests.

Deliverables:
- `lib/trpc/context.ts`
- `lib/trpc/init.ts`
- `lib/trpc/root.ts`
- `lib/trpc/routers/bidding.ts`
- `app/api/trpc/[trpc]/route.ts`
- `tests/trpc/bidding-router.test.ts`

Verification:
- test coverage for auth and error mapping
- lint/typecheck/test/build pass

## Phase D: PR-4 Driver Abstraction

Scope:
- Split service persistence into Prisma and Drizzle drivers.
- Switch services to feature-flag facade.
- Start parity test pack.

Deliverables:
- `lib/server/drivers/prisma-systems-driver.ts`
- `lib/server/drivers/drizzle-systems-driver.ts`
- `lib/server/drivers/prisma-invites-driver.ts`
- `lib/server/drivers/drizzle-invites-driver.ts`
- `lib/server/systems-service.ts`
- `lib/server/invite-service.ts`
- `tests/parity/systems-drivers-parity.test.ts`

Verification:
- lint/typecheck/test/build pass
- import-safe behavior without `DATABASE_URL` in prisma-mode

## Process Recovery Actions (SDD Governance)

1. Repo-first policy:
   - all new work starts from `spec -> plan -> tasks` in repo
   - Linear only mirrors approved tasks
2. Linear linkage:
   - every migration issue contains SDD backlink
3. PR discipline:
   - PR body includes `Spec Link`, scope, AC, evidence
4. CI follow-up:
   - add DB-backed parity check in matrix for drizzle path

## Out of Scope in This Backfill

- PR-5+ implementation
- Prisma removal and cutover
- UI functional changes unrelated to migration
