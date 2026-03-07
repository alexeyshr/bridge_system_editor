# F08 Performance and Indexing

Date: 2026-03-07
Scope: `specs/004-left-panel-evolution/08-performance-indexing.md`

## What was fixed

- Added memoized derived indexes in store:
  - rules by root node id;
  - node parent lookup;
  - section child map;
  - effective section ids by node;
  - section node counters.
- Added cached smart-view counters map with minute-based window for recently-edited view.
- Switched hot selectors to cached indexes:
  - `getSectionChildren`
  - `getSectionTree`
  - `getEffectiveSectionIds`
  - `getSubtreeRulesForNode`
  - `getPrimaryMatchedNodeIds`
  - `getSmartViewCount`
- Left panel section badge now shows node count per section using cached counters.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
