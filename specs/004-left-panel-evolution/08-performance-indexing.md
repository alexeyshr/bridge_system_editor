# F08 Performance and Indexing

## Goal

Keep left panel and filtered tree responsive with large systems.

## Scope

- Build indexes for subtree rules and section memberships.
- Avoid full recompute on every render.
- Recompute only on relevant mutations.

## Out of Scope

- Virtualized tree rendering (future task if needed).

## Implementation Tasks

1. Add memoized indexes:
   - rules by root node id
   - node parent lookup
   - section child map
2. Add batched recompute after mutations.
3. Add cheap counters cache for sections/smart views.
4. Profile with 1k+ nodes and 100+ sections.

## Done Criteria

- Section click updates tree without noticeable lag.
- Counter updates stay below acceptable frame budget.
- No O(N^2) loops in hot paths.
