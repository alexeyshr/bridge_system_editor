# Plan: PR-10 Editor Surface v2

Spec: `specs/007-editor-surface-v2/spec.md`  
Date: 2026-03-08  
Status: Draft

## Phase 1: Safe Mutation Foundation

Scope:
- unify destructive action semantics,
- introduce operation envelope for history tracking,
- add guardrails for remove vs delete flows.

Deliverables:
- safe action contracts,
- consistent dialog copy and intents.

Verification:
- deletion/removal regression tests pass.

## Phase 2: Undo/Redo Engine

Scope:
- command stack for core store mutations,
- keyboard shortcuts and toolbar controls,
- stack reset behavior on import/hard reload.

Deliverables:
- undo/redo middleware/hooks,
- action metadata for reversible operations.

Verification:
- deterministic undo/redo tests for core mutation matrix.

## Phase 3: Multi-Select + Batch Actions

Scope:
- row multi-select model,
- batch toolbar and scoped actions,
- batch safety prompts.

Deliverables:
- selection state and batch command handlers,
- assign/bookmark/pin/accept batch flows.

Verification:
- batch action tests and UI regression checks.

## Phase 4: Sections Drag/Drop

Scope:
- drag/drop reorder + reparent,
- visual drop affordances,
- fallback controls preserved.

Deliverables:
- DnD in sections tree,
- move constraints and error handling.

Verification:
- hierarchy integrity tests.

## Phase 5: Persisted UI + Domain UX

Scope:
- persist UI state and active filter,
- actor badge visibility,
- legal/illegal/duplicate hints,
- compact legend and quick-add path.

Deliverables:
- UI preference persistence,
- validation and legend components.

Verification:
- persistence + validation behavior tests.

## Phase 6: QA Views + Final Acceptance

Scope:
- add QA smart views and counters,
- final acceptance sweep.

Deliverables:
- new smart views,
- QA report.

Verification:
- full CI gate and manual QA evidence.
