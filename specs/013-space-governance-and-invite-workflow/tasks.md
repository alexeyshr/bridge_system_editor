# Tasks: PR-15 Space Governance and Invite Workflow

Spec: `specs/013-space-governance-and-invite-workflow/spec.md`  
Plan: `specs/013-space-governance-and-invite-workflow/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F06`

## F01 Spaces IA and Workspace Shell

- [x] T1501 unify spaces directory + own spaces context in `/dashboard/spaces`
- [x] T1502 migrate page to shared portal shell and breadcrumbs
- [x] T1503 add selected-space context and role-aware panels
- [x] T1504 add guest-safe states and sign-in prompts

## F02 Space Create/Edit Policy Controls

- [x] T1510 implement team space create form
- [x] T1511 implement settings editor for selected space
- [x] T1512 add slug/policy validation and inline feedback
- [x] T1513 enforce capability-aware visibility of controls

## F03 Join Request Moderation UX

- [x] T1520 list pending join requests for selected space
- [x] T1521 implement approve/reject actions
- [x] T1522 refresh workspace state after moderation
- [x] T1523 keep actor-side request history panel visible

## F04 Invite Management UX

- [x] T1530 implement invite create form (email, role, expiry)
- [x] T1531 implement invite list with status metadata
- [x] T1532 add copy invite link action
- [x] T1533 add revoke pending invite action

## F05 Invite Acceptance Route and Auth-Safe Flow

- [x] T1540 add `/space-invite/[token]` page
- [x] T1541 add unauthenticated sign-in gating
- [x] T1542 add token accept action and success/error state UX
- [x] T1543 link back to spaces workspace with selected space context

## F06 Quality Gate and Rollout Notes

- [x] T1550 run quality gates (`lint`, `typecheck`, `test`, `build`)
- [x] T1551 update roadmap/triage/spec traceability docs
- [x] T1552 add rollout note under `fix/*`
- [x] T1553 close PR-15 phase issues and parent in Linear
