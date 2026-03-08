# 2026-03-08 F02 Undo/Redo Engine

## Problem
Critical editor mutations had no rollback path. Users could not safely recover after accidental delete/remove/reassign operations.

## Root cause
Store had no dedicated mutation history model and no keyboard/UI affordances for reversible editing.

## Implemented
- Added snapshot-based undo/redo history for core mutation flows in `store/useBiddingStore.ts`.
- Added history invalidation on import/hydrate reset paths.
- Added toolbar controls in `components/CenterPanel.tsx`.
- Added keyboard shortcuts in `app/page.tsx`:
  - `Ctrl/Cmd+Z` -> Undo
  - `Shift+Ctrl/Cmd+Z` and `Ctrl/Cmd+Y` -> Redo
- Added deterministic tests in `tests/sections-data-model.test.ts`:
  - add/remove rollback
  - root pin/unpin rollback
  - history invalidation on import

## Guardrails
- History stack is bounded (`HISTORY_LIMIT`) to cap memory growth.
- Undo/redo applies to domain mutation slices only.
- Import/hydrate clears history to prevent cross-context replay.
