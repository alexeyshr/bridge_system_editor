# Tasks: PR-12 Collaboration, Discussions, and Sharing

Spec: `specs/009-collaboration-discussions-and-sharing/spec.md`  
Plan: `specs/009-collaboration-discussions-and-sharing/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F05`

## F01 Access Control Matrix

- [x] T1201 Define role capability matrix (`owner/editor/reviewer/viewer`).
- [x] T1202 Implement server-side policy guards per collaboration endpoint.
- [x] T1203 [P] Add role-based integration tests.

## F02 Invite Flows

- [x] T1210 Implement invite by email.
- [x] T1211 Implement invite by internal user lookup.
- [x] T1212 Implement Telegram handoff invite links.
- [x] T1213 Add invite state transitions (`pending`, `accepted`, `revoked`, `expired`).
- [x] T1214 [P] Add rate-limit and abuse tests on invite endpoints.

## F03 Discussions + Mentions

- [x] T1220 Implement system-level discussion threads.
- [x] T1221 Implement node-level discussion threads.
- [x] T1222 Implement mention parsing and notification dispatch.
- [x] T1223 Enforce boundary between editable system notes and discussion messages.
- [x] T1224 [P] Add thread and mention integration tests.

## F04 Read-Only Publish Links

- [x] T1230 Implement create/revoke/rotate read-only links.
- [x] T1231 Implement read-only viewer mode access checks.
- [x] T1232 Add audit events for link operations and accesses.
- [x] T1233 [P] Add link lifecycle tests.

## F05 Acceptance + Documentation

- [x] T1240 Run full quality gate (`lint`, `typecheck`, `test`, `build`).
- [x] T1241 Document permission model and invite/discussion contracts.
- [x] T1242 Add QA evidence and rollout notes.
