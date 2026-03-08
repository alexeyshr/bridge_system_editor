# Tasks: Bidding Module Migration Backfill (PR-1..PR-4)

Spec: `specs/002-sdd-migration-backfill/spec.md`  
Plan: `specs/002-sdd-migration-backfill/plan.md`

## Phase A (`PR-1`)

- [x] A01 Backfill baseline checklist artifact (`tests/ui-baseline/bidding-module-regression.md`) (`BRI-6`)
- [x] A02 Backfill domain contracts artifact (`lib/domain/bidding/contracts.ts`) (`BRI-7`)
- [x] A03 Backfill migration flags + env docs (`lib/config/feature-flags.ts`, `.env.example`, `readme.md`) (`BRI-8`)
- [x] A04 Mark PR-1 parent complete in tracker (`BRI-5`)

## Phase B (`PR-2`)

- [x] B01 Backfill Drizzle schema/config (`drizzle.config.ts`, `lib/db/drizzle/schema.ts`) (`BRI-10`)
- [x] B02 Backfill migration/rollback scripts (`drizzle/`, `drizzle/rollback/`) (`BRI-11`)
- [x] B03 Backfill DB health + seed scripts (`scripts/db-healthcheck.ts`, `scripts/db-seed.ts`) (`BRI-12`)
- [x] B04 Mark PR-2 parent complete in tracker (`BRI-9`)

## Phase C (`PR-3`)

- [x] C01 Backfill tRPC context/init/root (`lib/trpc/context.ts`, `lib/trpc/init.ts`, `lib/trpc/root.ts`) (`BRI-14`)
- [x] C02 Backfill bidding router + route handler (`lib/trpc/routers/bidding.ts`, `app/api/trpc/[trpc]/route.ts`) (`BRI-15`)
- [x] C03 Backfill router tests (`tests/trpc/bidding-router.test.ts`) (`BRI-16`)
- [x] C04 Mark PR-3 parent complete in tracker (`BRI-13`)

## Phase D (`PR-4`)

- [x] D01 Implement Drizzle repositories by interface (`BRI-18`)
- [x] D02 Add service abstraction and dual-driver wiring (`BRI-19`)
- [x] D03 Add parity tests baseline for Prisma vs Drizzle (`tests/parity/systems-drivers-parity.test.ts`) (`BRI-20`, in progress)
- [x] D04 Document regression/postmortem for eager Drizzle init and fix (`fix/2026-03-07-pr4-driver-split-and-drizzle-init-guard.md`, `expirience/2026-03-07-eager-drizzle-init-regression.md`)
- [ ] D05 Close PR-4 parent after parity CI matrix is enabled (`BRI-17`)

## Governance

- [x] G01 Add explicit SDD backfill package under `specs/`
- [x] G02 Add SDD link comment to all `BRI-5..BRI-20` issues
- [ ] G03 For next phase (PR-5), do not start implementation until new `spec -> plan -> tasks` is approved

## Verification

- [x] V01 `npm run lint`
- [x] V02 `npm run typecheck`
- [x] V03 `npm run test`
- [x] V04 `npm run build`
