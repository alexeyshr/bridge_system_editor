# 2026-03-08 — F05 Persisted UI + Domain UX

## Summary
Implemented F05 improvements:
- Persisted editor UI preferences in draft/local storage (tree view mode, search, panel visibility, section expansion, left panel collapses).
- Added explicit actor marker badge in sequence rows (`OPP`, `OUR-O`, `OUR-R`) for classic and compact modes.
- Added legal/illegal/duplicate call hints in continuation add flows.
- Added compact-lanes legend in center panel.
- Added inline quick-add path per row.
- Added command palette scaffold (`Ctrl/Cmd+K`) with primary editor actions.

## Notes
- Command palette intentionally implemented as scaffold (core actions + filter), ready for future keyboard navigation enhancements.
- UI state persistence is separated into store-backed draft and left-panel local preferences.

## Files
- store/useBiddingStore.ts
- components/CenterPanel.tsx
- components/LeftPanel.tsx
- components/SequenceRow.tsx
- components/TopBar.tsx
- specs/007-editor-surface-v2/tasks.md
