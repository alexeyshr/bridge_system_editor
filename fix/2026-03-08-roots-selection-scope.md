# Bug Fix: ROOTS Selection Scope in Center Tree

Date: 2026-03-08

## Issue

When multiple root bids exist, selecting a root in the left `ROOTS` panel still showed nodes from other trees in the center panel.

Example:
- Root `1D` selected
- Center tree still included `1C-1D` branch from the `1C` tree

## Root Cause

`CenterPanel` filtering handled only `sections` and `smartViews` modes. In `roots` mode it defaulted to showing all nodes.

## Applied Fix

File: `components/CenterPanel.tsx`

- Added root-scoped filtering for `leftPrimaryMode === 'roots'`:
  - detect selected root ID from current selected node sequence
  - include only nodes that belong to this root subtree (`rootId` or `rootId + ' ...'`)
- Included root mode in primary filtering activation.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed
