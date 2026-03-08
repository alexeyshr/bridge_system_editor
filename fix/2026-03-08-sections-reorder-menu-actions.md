# UI Improvement: Reorder Section Actions in Context Menu

Date: 2026-03-08

## Request

Add section ordering controls (up/down arrows) in the section context menu.

## Applied

File:
- `components/LeftPanel.tsx`

Changes:
- Added menu actions for each section:
  - `Move up` (arrow up)
  - `Move down` (arrow down)
- Actions call store reorder API:
  - `reorderSection(sectionId, targetIndex)`
- Reorder works within current sibling level (same parent).
- Buttons are disabled at boundaries:
  - first sibling cannot move up,
  - last sibling cannot move down.

## Verification

- `npm run typecheck` passed
- `npm run lint` passed
