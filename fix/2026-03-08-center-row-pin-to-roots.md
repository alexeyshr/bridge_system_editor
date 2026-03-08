# Feature Fix: Add Any Center Node to Roots via Row Action

Date: 2026-03-08

## Request

Allow adding any call from the center tree directly into roots (`SEQUENCE / OPP ROOTS` flow).

## Applied

File:
- `components/SequenceRow.tsx`

Changes:
- Added row action button with pin icon:
  - `Pin` = add node to roots
  - `PinOff` = remove node from roots
- Connected to existing store actions:
  - `addRootEntry(node.id)`
  - `removeRootEntry(node.id)`
- Added active visual state for already-pinned rows.

## Behavior

- Any node from center panel can now be pinned as a root entry and selected later from left panel roots.
- Existing tree structure is not modified when pin/unpin is used (only root-entry list is updated).

## Verification

- `npm run typecheck` passed
- `npm run lint` passed
