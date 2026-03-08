# Tasks: PR-11 Systems Lifecycle and Tournament Usage

Spec: `specs/008-systems-lifecycle-and-tournament-usage/spec.md`  
Plan: `specs/008-systems-lifecycle-and-tournament-usage/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F06`

## F01 Data Model + Contracts

- [x] T1101 Add entities for system lifecycle (`system`, `draft`, `version`).
- [x] T1102 Add tournament binding entities (`systemId + versionId`, scope, freeze state).
- [x] T1103 [P] Define tRPC procedures and zod schemas for lifecycle and bindings.
- [x] T1104 Add migration and compatibility tests.

## F02 Systems Hub

- [ ] T1110 Implement systems list with ownership/access filters.
- [ ] T1111 Implement search/tag/status filtering.
- [ ] T1112 Implement open-system flow into editor context.
- [ ] T1113 [P] Add hub query/mutation integration tests.

## F03 Draft/Published Lifecycle

- [ ] T1120 Implement publish mutation and immutable version creation.
- [ ] T1121 Implement compare draft vs published version.
- [ ] T1122 Implement create-draft-from-version flow.
- [ ] T1123 Implement editor shell controls (system switcher, version badge, publish CTA).
- [ ] T1124 [P] Add lifecycle state tests.

## F04 Tournament Usage Binding

- [ ] T1130 Implement bind/unbind version for tournament scope (pair/team/global).
- [ ] T1131 Implement freeze-on-start rules and transition checks.
- [ ] T1132 Expose binding view in tournament prep UI.
- [ ] T1133 [P] Add state machine tests for binding transitions.

## F05 Template Profiles (Bootstrap)

- [ ] T1140 Define system templates: `Standard`, `2/1`, `Precision`.
- [ ] T1141 Implement create-system-from-template flow.
- [ ] T1142 [P] Add template generation tests.

## F06 Acceptance + Documentation

- [ ] T1150 Run full quality gate (`lint`, `typecheck`, `test`, `build`).
- [ ] T1151 Update docs and architecture references.
- [ ] T1152 Record rollout notes and migration constraints.
