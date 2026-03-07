# Bug Fix: Stable ROOTS Ordering After Re-Add

Date: 2026-03-08

## Issue

After deleting a root call and adding it again, it appeared at the end of the ROOTS list.

## Root Cause

ROOTS list used object insertion order from `nodes`, so re-added root IDs were rendered last.

## Applied Fix

File: `components/LeftPanel.tsx`

- ROOTS list now uses explicit bid-order sorting with `compareSequences`.
- Order stays stable (`1C .. 7NT`) regardless of add/delete history.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
