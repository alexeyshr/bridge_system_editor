# UI Fix: Remove `Open` Menu Item and Close Menus on Outside Click

Date: 2026-03-08

## Request

- Remove `Open` item from left-panel action menus.
- Close action menu when clicking anywhere outside the menu/trigger.

## Applied

File: `components/LeftPanel.tsx`

- Removed `Open` from:
  - Section action menu
  - Custom smart-view action menu
- Added global `mousedown` outside-click handler while any action menu is open.
- Added data attributes to menu containers and trigger buttons to support reliable outside-click detection.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
