# Bugfix: Left Panel Root Removal No Longer Deletes Tree

Date: 2026-03-08

## Request

When removing an entry from the left Roots panel, do not delete the original sequence branch it came from.

## Root Cause

`LeftPanel` root delete flow had a destructive branch for depth-1 roots (`deleteSubtree=true`) and called `deleteNode`, which removed the node and all continuations.

## Fix

File:
- `components/LeftPanel.tsx`

Changes:
- Removed destructive subtree deletion path from root-remove dialog.
- Root remove action now always calls `removeRootEntry(nodeId)` only.
- Updated dialog copy to explicitly state that original sequence tree remains unchanged.

## Verification

- `npm run typecheck` passed
- `npm run lint` passed
