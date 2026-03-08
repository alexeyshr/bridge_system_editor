# ADR-0004: Zustand Slice Architecture (Single Store, Modular Slices)

- Status: Proposed
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: frontend, state, maintainability

## Context

`store/useBiddingStore.ts` currently aggregates nodes, sections, UI state, sync state, and persistence actions in one large module.
Feature growth has increased coupling and regression risk.

## Decision

- Keep one Zustand root store for atomic cross-domain updates.
- Refactor internal structure to slices:
  - `nodesSlice`
  - `sectionsSlice`
  - `editorUiSlice`
  - `syncSlice`
- Expose stable selectors/actions facade to avoid broad UI rewrites.
- Add React Error Boundaries at shell and panel level to isolate runtime failures.

## Consequences

### Positive

- Better maintainability and testability with bounded state modules.
- Lower blast radius for changes.
- Improved incident containment in UI runtime failures.

### Negative

- Refactor cost and temporary duplication during migration.
- Requires discipline to avoid cross-slice hidden dependencies.

## Alternatives Considered

1. Split into multiple independent stores:
   - partially rejected for now to avoid cross-store synchronization complexity.
2. Keep current monolithic store:
   - rejected due to scaling risk.

## Impacted Specs

- `specs/004-left-panel-evolution/README.md`
- `specs/005-platform-core-hardening/spec.md`

## Related Documents

- `docs/c4/c3-components-webapp.mmd`
- `tests/ui-baseline/bidding-module-regression.md`
