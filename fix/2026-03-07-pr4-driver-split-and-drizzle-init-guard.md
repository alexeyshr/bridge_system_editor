# Fix: PR-4 driver split + safe Drizzle initialization

Date: 2026-03-07  
Scope: `systems-service`, `invite-service`, Prisma/Drizzle drivers, parity tests

## What was fixed

1. Split server data access into dual drivers behind feature flag `DB_DRIVER`:
   - `lib/server/drivers/prisma-systems-driver.ts`
   - `lib/server/drivers/drizzle-systems-driver.ts`
   - `lib/server/drivers/prisma-invites-driver.ts`
   - `lib/server/drivers/drizzle-invites-driver.ts`
2. Reworked facades:
   - `lib/server/systems-service.ts` now routes calls to Prisma or Drizzle driver.
   - `lib/server/invite-service.ts` now routes calls to Prisma or Drizzle driver.
3. Added parity test suite for Prisma vs Drizzle systems behavior:
   - `tests/parity/systems-drivers-parity.test.ts` (runs when `DATABASE_URL` is set).

## Incident discovered during fix

- After adding Drizzle drivers, `npm test` and `next build` failed when `DATABASE_URL` was not set.
- Root cause: `lib/db/drizzle/client.ts` initialized Drizzle eagerly at module import time and threw immediately.

## Resolution

- Added guarded initialization in `lib/db/drizzle/client.ts`:
  - If `DATABASE_URL` is missing, module now returns a proxy that throws only when Drizzle is actually used.
  - This keeps Prisma-mode (`DB_DRIVER=prisma`) flows buildable/testable without requiring a Drizzle DB connection.

## Why this happened

- I introduced dual-driver imports, but left Drizzle client as eager-init singleton.
- That created hidden coupling: simply importing Drizzle-based code path caused hard failure, even when Drizzle was not selected by feature flag.

## Preventive rule

- For all optional providers (DB driver, transport, external integrations), initialization must be lazy/guarded and only happen on selected runtime path.
- Add at least one build/test check for each flag combination (`prisma` and `drizzle`) in CI in next step.
