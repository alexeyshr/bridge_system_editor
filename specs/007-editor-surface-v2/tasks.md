# Tasks: PR-10 Editor Surface v2

Spec: `specs/007-editor-surface-v2/spec.md`  
Plan: `specs/007-editor-surface-v2/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F06`

## F01 Safe Mutation Foundation

- [x] T1001 Define mutation intent taxonomy (`delete-node`, `remove-root`, `remove-section-link`).
- [x] T1002 Refactor existing dialogs/calls to use explicit non-overloaded actions.
- [x] T1003 [P] Add regression tests for safe remove vs delete scenarios.

## F02 Undo/Redo Engine

- [x] T1010 Implement command-based history stack for core store operations.
- [x] T1011 Add toolbar controls + keyboard shortcuts (`Ctrl/Cmd+Z`, `Shift+Ctrl/Cmd+Z`).
- [x] T1012 Define and implement stack invalidation rules on import/reset.
- [x] T1013 [P] Add deterministic undo/redo test suite.

## F03 Multi-Select + Batch Actions

- [x] T1020 Add center-row multi-select model and selection scope indicator.
- [x] T1021 Implement batch assign section action.
- [x] T1022 Implement batch bookmark and root pin/unpin actions.
- [x] T1023 Implement batch accepted/unaccepted action.
- [x] T1024 [P] Add batch action tests and UX safety prompts.

## F04 Sections Drag/Drop

- [x] T1030 Add section DnD reorder for siblings.
- [x] T1031 Add section DnD reparent to another section/root.
- [x] T1032 Enforce invalid move constraints and surface errors.
- [x] T1033 [P] Add hierarchy integrity tests.

## F05 Persisted UI + Domain UX

- [x] T1040 Persist panel/tree/mode/filter UI state to local storage.
- [x] T1041 Add explicit actor marker in center rows for classic and compact modes.
- [x] T1042 Add legal/illegal/duplicate validation hints in continuation add flows.
- [x] T1043 Add compact lanes legend and inline quick-add path.
- [x] T1044 Add command palette scaffold with primary editor actions.

## F06 QA Smart Views + Final Acceptance

- [ ] T1050 Add smart views: `Dead ends`, `No meaning`, `No HCP`, `No forcing`, `Conflict tags`.
- [ ] T1051 [P] Add tests for new smart view matchers and counts.
- [ ] T1052 Run quality gate (`lint`, `typecheck`, `test`, `build`).
- [ ] T1053 Publish QA evidence and update `fix/*` notes for surfaced regressions.
