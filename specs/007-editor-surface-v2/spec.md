# Spec: PR-10 Editor Surface v2 (Productivity + Safety)

Feature ID: `pr10-editor-surface-v2`  
Date: 2026-03-08  
Status: Draft for implementation

## Architecture References

- ADR: `docs/adr/ADR-0004-zustand-slice-architecture.md`
- ADR: `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`

## Context

Current editor UX is functionally solid but lacks high-throughput operations and safety rails for heavy daily use.
The next step is an operator-grade editor surface before expanding broader portal features.

## Problem Statement

Frequent edit operations are still too fragile and too click-heavy:
- no global undo/redo,
- destructive actions are not uniformly safe,
- no multi-select batch workflows,
- section ordering is partially manual,
- UI preferences are not consistently persisted.

## Goals

- Add reversible editing (`undo/redo`) across core mutations.
- Standardize safe destructive UX with explicit action semantics.
- Add multi-select and batch actions in center panel.
- Add section drag/drop operations (reorder + reparent).
- Persist editor UI preferences and filters across sessions.
- Improve domain clarity with actor visibility and legal-state feedback.

## Non-Goals

- No backend collaboration merge/conflict engine in this spec.
- No redesign of Left/Center/Right layout.
- No replacement of current node model.

## Functional Acceptance Criteria

- AC-01: User can undo and redo add/delete/rename/update/section assignment/root pin operations.
- AC-02: All destructive actions clearly separate `Delete node` from non-destructive removals (`Remove from roots/section`).
- AC-03: User can select multiple nodes and run batch actions: assign section, bookmark, pin to roots, accept/unaccept.
- AC-04: User can drag/drop sections to reorder siblings and change parent (same permission scope).
- AC-05: Editor remembers UI state: panel expansion, tree expansion, classic/compact mode, last primary filter.
- AC-06: Node row shows explicit actor marker for clarity in both classic and compact modes.
- AC-07: Continuation form and row state indicate legal/illegal/duplicate calls.
- AC-08: Built-in QA smart views exist: `Dead ends`, `No meaning`, `No HCP`, `No forcing`, `Conflict tags`.
- AC-09: Command palette (`Ctrl/Cmd+K`) executes major editor commands.
- AC-10: Inline quick-add path is available without opening full modal for common flows.
- AC-11: Compact lanes legend is discoverable and explains visual notation.
- AC-12: Full quality gate passes (`lint`, `typecheck`, `test`, `build`).

## Constraints

- Keep current visual language and avoid major layout regressions.
- Preserve backward compatibility of stored node payloads.
- Keep keyboard accessibility for new interactions.

## Risks

- Risk: Undo/redo stack can diverge from async persisted state.
  - Mitigation: command-based history with clear stack invalidation rules.
- Risk: Multi-select actions may affect hidden/filtered nodes unexpectedly.
  - Mitigation: explicit scope badge and confirmation for high-impact batch operations.
- Risk: Drag/drop in sections may introduce accidental hierarchy changes.
  - Mitigation: drop-target preview + undo support.

## Exit Criteria

- `specs/007` tasks completed with evidence.
- Linear parent + child issues completed and linked.
- `fix/*` notes include any behavior corrections during rollout.
