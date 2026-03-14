# Spec: PR-15 Space Governance and Invite Workflow

Feature ID: `pr15-space-governance-and-invite-workflow`  
Date: 2026-03-13  
Status: Implemented

## Architecture References

- ADR: `docs/adr/ADR-0010-space-scoped-content-and-system-governance.md`
- Spec dependency: `specs/011-space-scoped-content-and-system-integration/spec.md`

## Context

Space domain APIs already support:

- team/personal spaces,
- join requests and moderation,
- invite lifecycle and token acceptance.

Portal UX was still fragmented for operators, with no unified governance workspace.

## Problem Statement

Users can discover public spaces, but owners/admins cannot efficiently:

- manage space policy settings,
- moderate join requests,
- run invite operations,
- complete invite acceptance through a clear auth-safe browser flow.

## Goals

- Deliver unified Spaces workspace in portal.
- Provide create/edit controls for team space policy.
- Add join request moderation UI (approve/reject).
- Add invite management UI (create/copy/revoke/list).
- Add invite token acceptance route with sign-in gating.
- Keep guest and member states ACL-safe and explicit.

## Non-Goals

- No redesign of space ACL rules in this phase.
- No email delivery pipeline for invites.
- No pagination for large invite/request histories.
- No moderation audit dashboard yet.

## Functional Acceptance Criteria

- AC-01: User can discover spaces and view own membership context on one page.
- AC-02: Authenticated user can create team spaces with policy fields.
- AC-03: Owners/admins can update selected space policy settings.
- AC-04: Membership managers can review pending join requests.
- AC-05: Invite managers can create/revoke invites and copy invite links.
- AC-06: `/space-invite/[token]` supports sign-in gate and invite acceptance.
- AC-07: Invite acceptance route returns actionable success/error states.
- AC-08: Guest states remain read-only with sign-in prompts.
- AC-09: Quality gates pass (`lint`, `typecheck`, `test`, `build`).
- AC-10: Docs/Linear mapping and fix note are updated.

## Risks

- Risk: One-page workspace can become visually dense.
  - Mitigation: split into clear cards/sections and role-aware visibility.
- Risk: Invite acceptance confusion for unauthenticated actors.
  - Mitigation: explicit sign-in CTA with callback URL to token route.

## Exit Criteria

- PR-15 tasks complete in `specs/013-space-governance-and-invite-workflow/tasks.md`.
- Linear issues `BRI-86..BRI-91` completed.
- Quality gate green and rollout note added.
