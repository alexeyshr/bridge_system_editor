# ADR-0007: SSE for Collaboration Notifications

- Status: Proposed
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: realtime, collaboration, api

## Context

Collaboration requirements in this phase are server-to-client change notifications (owner/editor/viewer awareness), while mutations already flow via HTTP/tRPC.
Full-duplex real-time editing is not in scope.

## Decision

- Use Server-Sent Events (SSE) for notification stream delivery.
- Keep mutation path over existing HTTP/tRPC routes.
- Define event contract for:
  - system revision updated
  - access changed
  - invite accepted/revoked

## Consequences

### Positive

- Simpler deployment and runtime model than WebSockets.
- Native browser reconnect behavior.
- Matches one-way notification requirement.

### Negative

- One-way transport only.
- Requires attention to connection lifecycle and fan-out behavior.

## Alternatives Considered

1. WebSocket channel:
   - rejected as unnecessary complexity for current scope.
2. Polling-only:
   - rejected due to weaker UX and unnecessary load.

## Impacted Specs

- `specs/005-platform-core-hardening/spec.md`

## Related Documents

- `docs/c4/c3-components-api.mmd`
- `docs/c4/c3-components-webapp.mmd`
