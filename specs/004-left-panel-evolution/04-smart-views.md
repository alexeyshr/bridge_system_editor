# F04 Smart Views

## Goal

Add computed views in the left panel for fast navigation by conditions.

## Scope

- Built-in smart views:
  - `Unassigned`
  - `Bookmarked`
  - `No notes`
  - `Unaccepted`
  - `Recently edited`
- Optional custom smart views from query rules.
- Custom smart views are in MVP scope (not postponed).

## Out of Scope

- Deep query builder UI.

## Implementation Tasks

1. Add smart-view state and ids in store.
2. Implement selector `evalSmartView(nodeId, smartViewId)`.
3. Render `SMART VIEWS` block in left panel.
4. Add counters for each view.
5. Add pin/unpin behavior for ordering.

## Done Criteria

- Built-in views always available and computed from current nodes.
- Clicking a smart view filters center tree.
- Counts update immediately after node edits.
