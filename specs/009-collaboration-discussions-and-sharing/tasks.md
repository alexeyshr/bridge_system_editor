# Tasks: PR-12 Collaboration, Discussions, and Sharing

Spec: `specs/009-collaboration-discussions-and-sharing/spec.md`  
Plan: `specs/009-collaboration-discussions-and-sharing/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F05`

## F01 Access Control Matrix

- [ ] T1201 Define role capability matrix (`owner/editor/reviewer/viewer`).
- [ ] T1202 Implement server-side policy guards per collaboration endpoint.
- [ ] T1203 [P] Add role-based integration tests.

## F02 Invite Flows

- [ ] T1210 Implement invite by email.
- [ ] T1211 Implement invite by internal user lookup.
- [ ] T1212 Implement Telegram handoff invite links.
- [ ] T1213 Add invite state transitions (`pending`, `accepted`, `revoked`, `expired`).
- [ ] T1214 [P] Add rate-limit and abuse tests on invite endpoints.

## F03 Discussions + Mentions

- [ ] T1220 Implement system-level discussion threads.
- [ ] T1221 Implement node-level discussion threads.
- [ ] T1222 Implement mention parsing and notification dispatch.
- [ ] T1223 Enforce boundary between editable system notes and discussion messages.
- [ ] T1224 [P] Add thread and mention integration tests.

## F04 Read-Only Publish Links

- [ ] T1230 Implement create/revoke/rotate read-only links.
- [ ] T1231 Implement read-only viewer mode access checks.
- [ ] T1232 Add audit events for link operations and accesses.
- [ ] T1233 [P] Add link lifecycle tests.

## F05 Acceptance + Documentation

- [ ] T1240 Run full quality gate (`lint`, `typecheck`, `test`, `build`).
- [ ] T1241 Document permission model and invite/discussion contracts.
- [ ] T1242 Add QA evidence and rollout notes.
