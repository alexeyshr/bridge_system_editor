# Feature Fix: ROOTS Add/Delete with Bid Picker Modal

Date: 2026-03-08

## Request

- Add `+` in `ROOTS` to create new root bids.
- On click, open bid picker modal (1C..7NT), allow multi-select.
- Disable bids already present in `ROOTS`.
- Add ability to delete root bids.

## Applied

File: `components/LeftPanel.tsx`

- Added `ROOTS` add flow:
  - `+` button near `ROOTS` title opens modal.
  - modal shows 1C..7NT grid, multi-select enabled.
  - existing root bids are disabled and visually dimmed.
  - add action inserts all selected available roots in one submit.
- Added root deletion flow:
  - delete icon on root row (hover action).
  - confirmation modal before delete.
  - dialog shows selected root and descendant count.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed
