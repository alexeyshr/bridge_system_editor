# Plan: PR-15 Space Governance and Invite Workflow

Spec: `specs/013-space-governance-and-invite-workflow/spec.md`  
Date: 2026-03-13  
Status: Implemented (F01-F06 complete)

## Phase 1: IA and Workspace Shell

Scope:
- unify spaces discovery and own-space context in one workspace,
- align with dense portal shell and breadcrumbs.

Deliverables:
- refreshed `/dashboard/spaces` workspace layout.

## Phase 2: Create/Edit Policy Controls

Scope:
- create team space form and policy editor.

Deliverables:
- create flow,
- settings update flow for selected space.

## Phase 3: Join Request Moderation

Scope:
- list pending requests and provide approve/reject controls.

Deliverables:
- moderation section in spaces workspace,
- actor-side requests visibility.

## Phase 4: Invite Management

Scope:
- create/revoke/copy invite operations for selected space.

Deliverables:
- invite form + invite list with status.

## Phase 5: Invite Acceptance Route

Scope:
- token route with auth-safe acceptance flow.

Deliverables:
- `/space-invite/[token]` page with sign-in gate and feedback states.

## Phase 6: Quality and Rollout

Scope:
- run full checks and update traceability artifacts.

Deliverables:
- updated roadmap/triage/spec mapping,
- rollout note in `fix/*`.
