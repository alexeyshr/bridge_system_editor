# Spec: Bidding Module Migration Backfill (PR-1..PR-4)

Feature ID: `sdd-migration-backfill`  
Date: 2026-03-07  
Status: Approved (Backfill)

## Architecture References

- ADR: `docs/adr/ADR-0001-api-first-modular-monolith.md`
- ADR: `docs/adr/ADR-0002-drizzle-trpc-default-stack.md`
- C4: `docs/c4/c2-container.mmd`
- C4: `docs/c4/c3-components-api.mmd`

## Context

This document backfills SDD artifacts for already implemented migration work that was tracked in Linear first.

Linear project:
- `BridgeHub / Bidding Module Migration (2 weeks)`

Linear issues in scope:
- `BRI-5` `BRI-6` `BRI-7` `BRI-8` (PR-1)
- `BRI-9` `BRI-10` `BRI-11` `BRI-12` (PR-2)
- `BRI-13` `BRI-14` `BRI-15` `BRI-16` (PR-3)
- `BRI-17` `BRI-18` `BRI-19` `BRI-20` (PR-4)

## Problem Statement

Migration implementation started through Linear tasks before creating an explicit `spec -> plan -> tasks` source in repo.  
This creates process risk: requirements and acceptance criteria can drift from implementation.

## Goals

- Re-establish repo as source of truth for migration work.
- Capture exact completed scope for PR-1..PR-4.
- Define acceptance evidence and residual risks.
- Sync each Linear issue to SDD artifacts via links.

## Non-Goals

- No new product functionality beyond already implemented PR-1..PR-4 scope.
- No cutover/removal of Prisma in this backfill.
- No UI redesign.

## In Scope

1. Baseline + contracts + migration flags (`PR-1`).
2. Drizzle foundation and migrations (`PR-2`).
3. tRPC server layer and router tests (`PR-3`).
4. Driver abstraction Prisma/Drizzle with feature flag and parity test baseline (`PR-4`).

## Functional Acceptance Criteria

- AC-01: Repo contains SDD artifacts (`spec.md`, `plan.md`, `tasks.md`) for migration PR-1..PR-4.
- AC-02: Every PR-1..PR-4 scope item maps to concrete files and verification evidence.
- AC-03: Linear PR-1..PR-4 issues include backlink to this SDD package.
- AC-04: Driver abstraction supports runtime selection by `DB_DRIVER`.
- AC-05: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass after backfill.

## Artifacts Covered

- UI baseline checklist and screenshot container:
  - `tests/ui-baseline/bidding-module-regression.md`
  - `tests/ui-baseline/screenshots/.gitkeep`
- Domain contracts:
  - `lib/domain/bidding/contracts.ts`
- Feature flags:
  - `lib/config/feature-flags.ts`
- Drizzle foundation:
  - `drizzle.config.ts`
  - `lib/db/drizzle/schema.ts`
  - `lib/db/drizzle/client.ts`
  - `drizzle/`
  - `scripts/db-healthcheck.ts`
  - `scripts/db-seed.ts`
- tRPC foundation:
  - `lib/trpc/init.ts`
  - `lib/trpc/context.ts`
  - `lib/trpc/root.ts`
  - `lib/trpc/routers/bidding.ts`
  - `app/api/trpc/[trpc]/route.ts`
  - `tests/trpc/bidding-router.test.ts`
- Driver split:
  - `lib/server/drivers/prisma-systems-driver.ts`
  - `lib/server/drivers/drizzle-systems-driver.ts`
  - `lib/server/drivers/prisma-invites-driver.ts`
  - `lib/server/drivers/drizzle-invites-driver.ts`
  - `lib/server/systems-service.ts`
  - `lib/server/invite-service.ts`
  - `tests/parity/systems-drivers-parity.test.ts`

## Risks and Mitigations

- Risk: optional Drizzle path can break prisma-mode build when env is absent.
  - Mitigation: guarded Drizzle initialization proxy in `lib/db/drizzle/client.ts`.
- Risk: parity tests not executed without DB.
  - Mitigation: CI matrix with Postgres for Drizzle parity in next phase.

## Exit Criteria

- SDD backfill reviewed and accepted.
- Linear issues linked to this spec package.
- Next implementation phase starts only from SDD (`PR-5+`).
