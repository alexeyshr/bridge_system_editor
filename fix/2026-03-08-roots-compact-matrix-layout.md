# UI Improvement: Compact ROOTS Matrix Layout

Date: 2026-03-08

## Request

Make ROOTS more compact when many root calls are added.
Use matrix order by level with suit order:
- `NT, S, H, D, C`

## Applied

File: `components/LeftPanel.tsx`

- Replaced vertical ROOTS list with compact 7x5 matrix.
- Rows: levels `1..7`.
- Columns (left to right): `NT, S, H, D, C`.
- Existing root calls are clickable cells.
- Missing root calls are shown as dim placeholders.
- Root delete action preserved via compact hover trash button on each existing cell.
- Selected root highlight now works by current selected node root prefix.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed
