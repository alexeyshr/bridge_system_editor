# 2026-03-08 — F04 Sections Drag/Drop

## Summary
Implemented drag-and-drop section management in the left panel:
- sibling reorder by drag,
- reparent into another section,
- visual drop hints (before/inside/after),
- inline error surface for invalid moves.

## Root Cause Addressed
Section hierarchy operations existed in store (`moveSection`) but UI exposed only arrow-based reorder, causing friction and limited parent-change workflows.

## Safeguards
- Prevent self-move and descendant-move via existing store constraints.
- Keep menu-based up/down fallback controls.
- Added hierarchy integrity tests for invalid targets and reparent ordering.

## Files
- components/LeftPanel.tsx
- tests/sections-data-model.test.ts
- specs/007-editor-surface-v2/tasks.md
