# UI Fix: Add Continuation Action Row Order and Overflow

Date: 2026-03-08

## Request

- Swap `Cancel` and `Add` button positions in add-continuation form.
- Ensure controls fit inside popup width without overflow.

## Applied

File: `components/SequenceRow.tsx`

- Changed action row layout from flex to grid:
  - `minmax(0,1fr)` input column + two auto button columns
- Added `min-w-0` on input to allow proper shrink inside container.
- Added `shrink-0` for action buttons.
- Swapped button order to: `Cancel` then `Add`.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
