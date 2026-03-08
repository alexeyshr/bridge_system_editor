# UI Improvement: Root Suit Order in Modals + ROOTS Matrix/List Toggle

Date: 2026-03-08

## Request

- Use suit order `NT, S, H, D, C` in:
  - ROOTS add modal
  - Add-continuation modal
- Add ROOTS view switch: `Matrix / List`

## Applied

Files:
- `components/LeftPanel.tsx`
- `components/SequenceRow.tsx`

Changes:
- ROOTS add modal bids now render in `NT, S, H, D, C` order per level.
- Add-continuation bid grid now renders in the same suit order per level.
- Added `Matrix / List` toggle in ROOTS header.
- Matrix mode keeps compact 7x5 layout.
- List mode restores vertical root list view.

Notes:
- Internal bid ranking/validation logic remains unchanged (`C < D < H < S < NT`) for correct bidding rules.
- Only visual ordering in grids was changed.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed
