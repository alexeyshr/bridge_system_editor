# ADR-0005: Auth Stack Migration Direction (Better Auth vs Auth.js v5)

- Status: Proposed
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: auth, security, migration

## Context

Current auth path uses `next-auth@4` (legacy line).
Roadmap requires durable multi-provider auth (email/password + Telegram) with role-based sharing.

## Decision

- Use a two-step decision gate in the next cycle:
  1. Build a migration spike and compatibility matrix for:
     - Better Auth
     - Auth.js v5
  2. Select one target and complete migration in one implementation stream.
- Decision criteria:
  - adapter maturity for Drizzle
  - stability across minor upgrades
  - migration complexity from current state
  - Telegram integration complexity

## Consequences

### Positive

- Avoids blind migration to a new auth stack.
- Captures technical decision with explicit constraints and evidence.

### Negative

- Adds one focused discovery step before implementation.
- Delays final auth migration by one short sprint phase.

## Alternatives Considered

1. Stay on next-auth v4:
   - rejected due to long-term maintenance risk.
2. Choose stack immediately without spike:
   - rejected due to insufficient evidence for this codebase.

## Impacted Specs

- `specs/001-authentication-and-database/spec.md`
- `specs/005-platform-core-hardening/spec.md`

## Related Documents

- `docs/ROADMAP.md`
- `docs/c4/c3-components-api.mmd`
