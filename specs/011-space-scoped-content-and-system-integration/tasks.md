# Tasks: PR-13 Space-Scoped Content and System Integration

Spec: `specs/011-space-scoped-content-and-system-integration/spec.md`  
Plan: `specs/011-space-scoped-content-and-system-integration/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F06`

## F01 Space and Membership Data Model

- [x] T1301 Add `spaces` table with type/visibility/join/review policies.
- [x] T1302 Add `space_members` table with role model and uniqueness constraints.
- [x] T1303 Add `space_join_requests` and `space_invites` lifecycle tables.
- [x] T1304 [P] Add migration tests for enum and FK constraints.

## F02 ACL Services and API Contracts

- [x] T1310 Implement shared ACL helpers for spaces/content/systems.
- [x] T1311 Add API contracts for create/list/update spaces.
- [x] T1312 Add API contracts for join request, approve/reject, and invite flows.
- [x] T1313 [P] Add authorization negative tests for cross-space access.

## F03 System Ownership and Transfer Integration

- [x] T1320 Enforce default personal space for new systems.
- [x] T1321 Enforce owner-only publish guard for systems.
- [x] T1322 Implement move-system-to-space flow with audit event.
- [x] T1323 [P] Add ownership and transfer integration tests.

## F04 Content Domain MVP

- [x] T1330 Add `content_items` and `content_versions` tables.
- [x] T1331 Add block-schema validation and content version snapshots.
- [x] T1332 Implement content lifecycle (`draft`, `published`, `archived`).
- [x] T1333 Add `content_tags` and `content_links` for indexing and relations.
- [x] T1334 [P] Add content lifecycle and schema tests.

## F05 Strict Visibility and Discovery Integration

- [x] T1340 Enforce strict rule: hidden spaces cannot publish public content.
- [x] T1341 Apply ACL-aware visibility filters in feeds/search.
- [x] T1342 Implement public space directory and join-request UX states.
- [x] T1343 [P] Add leak-prevention tests for guest/non-member/member paths.

## F06 Tournament Optional Binding and Acceptance

- [x] T1350 Keep tournament binding optional in publish workflows.
- [x] T1351 Align Operations/Tournament Desk binding UX with optional policy.
- [x] T1352 Run full quality gate (`lint`, `typecheck`, `test`, `build`).
- [x] T1353 Update docs and rollout notes.
