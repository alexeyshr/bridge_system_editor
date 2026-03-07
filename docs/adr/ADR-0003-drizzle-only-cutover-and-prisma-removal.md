# ADR-0003: Drizzle-Only Cutover and Prisma Removal

- Status: Proposed
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: data, migration, simplification

## Context

Repository currently keeps Prisma and Drizzle paths alive in parallel.
This increases implementation cost per endpoint and multiplies regression risk.

The target scale for this product phase is 15-20K users, where single-path architecture and low operational overhead are more important than multi-path optionality.

## Decision

- Execute explicit cutover to Drizzle as the only DB access path.
- Remove Prisma runtime dependency, generated client, schema, and migration flow after parity sign-off.
- Keep a short rollback window only at deployment level (release rollback), not by dual-driver code.

## Consequences

### Positive

- Reduces cognitive load and maintenance cost for every future feature.
- Removes dual-path bug class and parity drift.
- Simplifies CI and local onboarding.

### Negative

- Requires a carefully sequenced cutover window.
- Temporary migration pressure on remaining endpoints that still reference Prisma artifacts.

## Alternatives Considered

1. Keep dual-driver long-term:
   - rejected due to permanent complexity tax.
2. Revert to Prisma-only:
   - rejected because project direction is already Drizzle + tRPC.

## Impacted Specs

- `specs/001-authentication-and-database/spec.md`
- `specs/005-platform-core-hardening/spec.md`

## Related Documents

- `docs/adr/ADR-0002-drizzle-trpc-default-stack.md`
- `specs/004-left-panel-evolution/README.md`
