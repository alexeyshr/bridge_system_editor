# ADR-0001: API-First Modular Monolith for BridgeHub

- Status: Accepted
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: architecture, api, process

## Context

The bidding editor is currently the first production-grade module, but it must become one part of a larger portal.  
If we optimize only for the current UI, later integration will require expensive rewrites.

We need:
- stable module boundaries now,
- ability to add auth, sharing, Telegram, and search incrementally,
- deployment simplicity for self-hosted VPS.

## Decision

Adopt an API-first modular monolith:

- Single Next.js deployable for now.
- Internal domain modules with explicit boundaries (Identity, Bidding, Sharing, Search, Bot integration).
- UI consumes typed API contracts (tRPC) instead of direct persistence calls.
- Data access isolated behind drivers/adapters.

## Consequences

### Positive

- Keeps current delivery speed of a monolith while avoiding a "big ball of mud".
- Enables portal growth without replacing the existing bidding UI.
- Makes Telegram mini app and bot reuse the same domain APIs.

### Negative

- Requires discipline in boundaries and docs (ADR/C4/spec links).
- Some overhead now (contracts and adapters) for benefits realized later.

## Alternatives Considered

1. UI-first with direct DB/store coupling:
   - rejected due to high migration risk.
2. Microservices from day one:
   - rejected due to operational complexity for current team size.

## Impacted Specs

- `specs/001-authentication-and-database/spec.md`
- `specs/002-sdd-migration-backfill/spec.md`
- `specs/003-pr5-trpc-client-preserve-ui/spec.md`
- `specs/004-left-panel-evolution/README.md`

## Related Documents

- `docs/VISION.md`
- `docs/bounded-contexts.md`
- `docs/c4/c1-context.mmd`
- `docs/c4/c2-container.mmd`
