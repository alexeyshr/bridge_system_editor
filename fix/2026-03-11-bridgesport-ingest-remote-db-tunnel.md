# Fix Note: BridgeSport ingest to remote Postgres via SSH tunnel

Date: 2026-03-11  
Context: local CLI migration/ingest from `bridge_system_editor_sync`

## Problem

`drizzle-kit migrate` / `db:ingest:bridgesport` failed with:

`ECONNREFUSED 185.196.41.85:5433`

## Root cause

Postgres on VPS is intentionally bound to loopback only:

- docker mapping: `127.0.0.1:5433 -> 5432`
- no external listener on `185.196.41.85:5433`

Direct DB access from laptop is blocked by design.

## Fix

1. Use SSH local port-forward for CLI:
   - `127.0.0.1:15433 -> VPS 127.0.0.1:5433`
2. Run migrate/ingest against local tunnel endpoint.
3. Add explicit DB pool shutdown for CLI scripts:
   - `lib/db/drizzle/client.ts`: `closeDrizzleConnection()`
   - `scripts/ingest-bridgesport.ts`: call close in `finally`
   - `scripts/db-seed.ts`: call close in `finally`

## Verification

- Migration applied successfully through tunnel.
- Ingest completed successfully.
- Data counts in server DB:
  - tournaments: 2081
  - players: 5998
  - rating_snapshots: 614
  - calendar_events: 81
