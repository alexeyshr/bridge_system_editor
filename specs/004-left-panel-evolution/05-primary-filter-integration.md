# F05 Primary Filter Integration

## Goal

Integrate section/smart-view selection with center tree rendering.

## Scope

- Primary mode: `none | section | smart`.
- Section click applies section filter.
- Smart view click applies smart filter.
- Preserve tree context by showing matching nodes plus ancestors.

## Out of Scope

- Changes to right panel card layout.

## Implementation Tasks

1. Implement `getPrimaryMatchedNodeIds`.
2. Implement `getDisplayNodeIdsWithAncestors`.
3. Add top filter chip in center area (`Section: X` or `Smart: Y`).
4. Add clear filter action (`Show full tree`).
5. Auto-expand paths to matching nodes.

## Done Criteria

- Filter switch is instant and stable.
- Tree remains navigable with collapsed/expanded behavior.
- Clearing filter returns exact previous unfiltered behavior.
