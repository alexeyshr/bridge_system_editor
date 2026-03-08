# Bugfix: Root Row Hidden in Compact Lanes

Date: 2026-03-08

## Problem

In root-filter mode, `Compact lanes` did not show the selected root row, while `Classic` did.
This caused inconsistent behavior between view modes.

## Root Cause

`components/CenterPanel.tsx` had an explicit `isHiddenRootRow` condition that skipped rendering the active root node in compact mode.
Depth calculation was also shifted (`rootSequenceLength`) assuming the root row is hidden.

## Fix

File:
- `components/CenterPanel.tsx`

Changes:
- Removed compact-only skip of active root row.
- Unified depth base for root-filter mode to `Math.max(0, rootSequenceLength - 1)` so indentation remains correct when root row is visible.

## Verification

- `npm run typecheck` passed
- `npm run lint` passed
