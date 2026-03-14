# Spec: PR-16 Node Change Timeline and Audit Surface

Feature ID: `pr16-node-change-timeline-and-audit-surface`
Date: 2026-03-13
Status: Delivered (F01-F06)

## Architecture References

- Workflow: `docs/WORKFLOW.md`
- Prior dependency: `specs/008-systems-lifecycle-and-tournament-usage/spec.md`
- Prior dependency: `specs/012-content-authoring-ux-and-publication/spec.md`
- Prior dependency: `specs/013-space-governance-and-invite-workflow/spec.md`

## Context

Audit events already exist for invites/discussions/read-only links, but editor/system lifecycle actions are not surfaced in one timeline. Operators cannot quickly answer "who changed what and when" for node and lifecycle operations.

## Problem Statement

The editor lacks a first-class timeline for:

- node sync/edit operations,
- lifecycle operations (publish/draft restore),
- tournament binding changes,
- system metadata and transfer actions.

## Goals

- Provide a stable server contract for system timeline events.
- Expand audit coverage for key editor/system operations.
- Expose a compact timeline UI in lifecycle menu.
- Keep ACL strict: only actors with system access can read timeline.

## Non-Goals

- No real-time stream / websocket updates.
- No cross-system global audit feed.
- No long-range analytics dashboards.
- No dedicated user profile pages or identity directory in this phase.

## Functional Acceptance Criteria

- AC-01: Timeline query exists via tRPC for authenticated users with access.
- AC-02: Timeline events include action/category/actor/target/timestamp/payload summary.
- AC-03: Node sync operations create auditable events with sequence scope hints.
- AC-04: Lifecycle and binding actions create auditable events.
- AC-05: `SystemLifecycleMenu` displays recent timeline events with loading/empty/error states.
- AC-06: User can filter displayed timeline by event category.
- AC-07: Quality gates pass for delivered phases (`lint`, `typecheck`, `test`).

## Risks

- Risk: event payload can grow too large for UI.
  - Mitigation: compact payload summary and sequence preview truncation.
- Risk: missing actor fields for legacy events.
  - Mitigation: explicit fallback rendering (`System` / `Unknown actor`).

## Exit Criteria (this step)

- F01-F06 implemented and mapped in Linear.
- Timeline API includes category filtering, cursor paging, and window controls.
- Lifecycle menu exposes diff/jump affordances and resilient actor attribution.
- Spec/tasks/Linear mapping and rollout note updated.
