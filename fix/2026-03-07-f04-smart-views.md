# 2026-03-07 - F04 Smart Views

## Summary

Implemented built-in and custom smart views with live counters, pin/unpin ordering, and center-tree filtering by selected smart view.

## Implemented

1. Store model for smart views:
   - built-in smart views (`Unassigned`, `Bookmarked`, `No notes`, `Unaccepted`, `Recently edited`)
   - custom smart views (`name`, `query`, `field`)
   - pin state and ordering
2. Store actions:
   - `createCustomSmartView`
   - `updateCustomSmartView`
   - `deleteCustomSmartView`
   - `toggleSmartViewPinned`
3. Store selectors:
   - `getSmartViews`
   - `evalSmartView`
   - `getSmartViewCount`
4. Added node touch tracking for `Recently edited` view:
   - updates on node add/update
   - remap on rename
   - cleanup on delete
5. Left panel UI:
   - `SMART VIEWS` block
   - built-in + custom list
   - counters
   - pin/unpin controls
   - create/edit/delete custom smart view modal
6. Center panel:
   - smart view filter application
   - active filter chip with clear action

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
