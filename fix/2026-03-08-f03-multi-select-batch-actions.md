# 2026-03-08 F03 Multi-Select and Batch Actions

## Problem
Editor operations on many nodes were one-by-one only, which increased misclick risk and slowed section/bookmark/root/accepted curation.

## Root cause
Store and center panel had single-node interaction model only (`selectedNodeId`), with no batch mutation primitives.

## Implemented
- Added multi-selection model in store:
  - `selectedNodeIds`
  - `toggleNodeSelection`, `setNodeSelection`, `clearNodeSelection`
- Added batch mutation APIs:
  - `batchAssignNodesToSection`
  - `batchSetBookmarks`
  - `batchSetRootEntries`
  - `batchSetAccepted`
- Wired center panel batch toolbar with selection scope indicator (`selected/visible`).
- Added row checkbox and Ctrl/Cmd+click multi-select behavior.
- Added regression tests for batch flows and undo integration.

## Safety
- Batch mutations are single history entries (undo-able in one step).
- All batch actions validate node existence and return deterministic `updatedCount`.
