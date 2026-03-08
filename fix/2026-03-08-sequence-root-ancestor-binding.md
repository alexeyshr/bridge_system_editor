# Behavior Fix: Sequence Roots Show Binding to Base Root Path

Date: 2026-03-08

## Request

When selecting a sequence root from `SEQUENCE / OPP ROOTS` (e.g. `1C - 3S`), it should appear bound to base root `1C` in center tree.

## Root Cause

Root-filter mode showed only selected root entry subtree, without ancestors.
So `1C - 3S` was displayed detached from its base root path.

## Fix

Files:
- `components/CenterPanel.tsx`
- `store/useBiddingStore.ts`

Changes:
- In root-filter mode, center panel now includes ancestor chain of selected root entry in display set.
  - Example: selecting `1C - 3S` shows `1C` -> `3S` path and descendants under `3S`.
- Unified depth base to preserve natural indentation from auction root.
- On root-entry selection, expanded all nodes along selected root path automatically to prevent hidden path due collapse state.

## Verification

- `npm run typecheck` passed
- `npm run lint` passed
