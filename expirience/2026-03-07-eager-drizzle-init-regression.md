# Incident: eager Drizzle init broke prisma-mode tests/build

Date: 2026-03-07

## Symptom

- `npm run test` failed with:
  - `DATABASE_URL is required to initialize Drizzle`
- `npm run build` failed while collecting route data with the same error.

## Why it happened

- I added Drizzle drivers and imported them into shared services.
- `lib/db/drizzle/client.ts` initialized Drizzle immediately at module load.
- In `DB_DRIVER=prisma` mode (or without `DATABASE_URL`), code still imported Drizzle modules, which threw before feature-flag routing executed.

## Fix

- Switched Drizzle client init to guarded behavior:
  - if `DATABASE_URL` is absent, export a proxy that throws only on actual Drizzle usage.
- This keeps prisma-mode import-safe and defers failure to real drizzle execution path.

## Preventive actions

1. Treat optional infra providers as lazy-initialized only.
2. Add CI matrix for `DB_DRIVER=prisma` and `DB_DRIVER=drizzle`.
3. For new integrations, include an import-safety check (`node -e \"require(...)\"`) without provider env.
