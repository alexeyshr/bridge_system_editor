# UI Fixes: Right Panel Sections, Tree Collapse, Selected Row Actions

Date: 2026-03-08

## Changes

1. Removed `Sections` block from the right node card.
- File: `components/RightPanel.tsx`
- Result: section assignment is now managed from row action popup only, card stays cleaner.

2. Fixed expand/collapse behavior in center tree.
- File: `components/CenterPanel.tsx`
- Root cause: `forcedExpandedNodeIds` was applied even when no primary filter was active, so collapsed ancestors were not hiding descendants.
- Fix: apply forced expansion only when section/smart-view primary filter is active.

3. Row actions now remain visible for selected node.
- File: `components/SequenceRow.tsx`
- Result: when a row is selected, actions (`Add`, `Bookmark`, `Assign sections`, `Delete`) stay visible without hover.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
