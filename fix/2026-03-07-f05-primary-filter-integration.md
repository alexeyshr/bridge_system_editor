# 2026-03-07 - F05 Primary Filter Integration

## Summary

Integrated primary left-panel filters into center tree rendering with section/smart view support and ancestor-preserving display.

## Implemented

1. Store selectors:
   - `getPrimaryMatchedNodeIds()`
   - `getDisplayNodeIdsWithAncestors()`
2. Filter logic:
   - section mode matches by effective section membership
   - smart mode matches by smart-view evaluator
3. Center panel integration:
   - applies primary filter result set
   - keeps ancestors visible for matched nodes
   - auto-expands paths to matched nodes while filter is active
4. Active filter chip:
   - `Section: ...` / `Smart: ...`
   - `Clear` action returns full unfiltered tree
5. Left panel behavior alignment:
   - selecting roots/bookmarks clears active primary filter
   - switching section/smart mode clears opposite active id

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
