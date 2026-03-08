# Spec: PR-12 Collaboration, Discussions, and Sharing

Feature ID: `pr12-collaboration-discussions-and-sharing`  
Date: 2026-03-08  
Status: Draft for implementation

## Architecture References

- ADR: `docs/adr/ADR-0007-sse-for-collaboration-notifications.md`
- ADR: `docs/adr/ADR-0008-observability-and-protection-baseline.md`
- ADR: `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`

## Context

As the module evolves from solo editing to shared work, collaboration must be explicit and safe:
- role-based permissions,
- invite channels,
- discussion flow for systems/nodes,
- read-only distribution links.

## Problem Statement

Current model does not clearly separate editable content from discussion and does not provide complete sharing workflows for real user collaboration.

## Goals

- Implement role-based access (`owner`, `editor`, `reviewer`, `viewer`).
- Implement invite flows: email, internal username lookup, Telegram handoff.
- Implement discussion threads on system and node scopes with mentions.
- Keep `system notes` editor-only and separate from discussions.
- Add publish read-only links for partner learning/review.

## Non-Goals

- No real-time co-editing (Google Docs style).
- No private direct messaging feature set.
- No external social feed in this phase.

## Functional Acceptance Criteria

- AC-01: Permissions are enforced per role for edit/publish/share/discussion actions.
- AC-02: Owner can invite users by email and internal username.
- AC-03: Owner/editor can generate Telegram handoff links for invite flow.
- AC-04: System-level and node-level discussion threads are supported.
- AC-05: Mention syntax triggers notification events for referenced users.
- AC-06: System notes remain editable only by owner/editor and are not discussion messages.
- AC-07: Reviewer can comment and suggest but cannot mutate bidding tree directly.
- AC-08: Viewer has read-only access including discussions visibility by policy.
- AC-09: Read-only publish link can be created, revoked, and rotated.
- AC-10: Share/invite/discussion actions produce auditable events.
- AC-11: Sensitive endpoints are rate-limited and logged.
- AC-12: Quality gates pass (`lint`, `typecheck`, `test`, `build`).

## Constraints

- Access checks must be server-authoritative.
- Invite and mention flows must be resilient to user rename/profile updates.
- Discussion model must not mutate node meaning payload.

## Risks

- Risk: Permission leakage between note and discussion domains.
  - Mitigation: separate storage and permission guards by endpoint.
- Risk: Mention spam or invite abuse.
  - Mitigation: rate limits + audit logs + moderation hooks.
- Risk: UX complexity in role transitions.
  - Mitigation: explicit role labels and capability matrix in UI.

## Exit Criteria

- Spec tasks complete with evidence.
- Access matrix documented and validated by integration tests.
- Linear issues completed and linked.
