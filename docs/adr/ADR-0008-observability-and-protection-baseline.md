# ADR-0008: Observability and Protection Baseline (pino, Sentry, Rate Limits)

- Status: Proposed
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: observability, security, operations

## Context

As multi-user and sharing flows grow, silent failures and abuse paths become high-risk.
Current stack needs a minimal but production-grade baseline.

## Decision

- Add structured application logging (`pino`) for server routes/services.
- Add error tracking (`Sentry`) for client and server runtime exceptions.
- Add rate limiting for sensitive endpoints:
  - auth
  - invite creation/acceptance
  - user search
- Define standard error envelope and correlation ID propagation for diagnostics.

## Consequences

### Positive

- Faster incident detection and debugging.
- Better abuse resistance on public endpoints.
- Clear operational visibility without heavy infrastructure.

### Negative

- Additional integration and alert tuning effort.
- Requires log hygiene and PII controls.

## Alternatives Considered

1. Keep console logging only:
   - rejected due to weak operability.
2. Introduce heavy observability stack immediately:
   - rejected as premature for current scale.

## Impacted Specs

- `specs/005-platform-core-hardening/spec.md`

## Related Documents

- `docs/WORKFLOW.md`
- `docs/ROADMAP.md`
