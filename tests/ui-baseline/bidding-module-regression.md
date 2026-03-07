# Bidding Module UI Regression Baseline (PR-1)

Date: 2026-03-07  
Owner: `BRI-6`  
Scope: Preserve existing editor UX while backend migrates (Prisma/REST -> Drizzle/tRPC).

## Test Environment

- URL: `http://localhost:3000`
- Browser: Chrome latest (desktop), width `1536`
- Seed data: default tree (`1C -> 1D -> 1H ...`)
- Panels: left and right visible by default

## Screenshot Baseline Manifest

Store reference screenshots under `tests/ui-baseline/screenshots/`:

1. `01-shell-default.png` - app shell with 3 panels
2. `02-left-panel-roots-bookmarks.png` - left panel sections
3. `03-center-classic-selected-node.png` - classic tree with selected row
4. `04-center-compact-lanes.png` - compact lanes mode
5. `05-current-sequence-breadcrumb-clickable.png` - current sequence breadcrumb
6. `06-right-panel-empty-state.png` - right panel no node selected
7. `07-right-panel-node-edit-state.png` - form fields visible
8. `08-add-continuation-form-open.png` - expanded add continuation form
9. `09-add-continuation-disabled-bids.png` - unavailable bids dimmed
10. `10-delete-confirm-modal.png` - custom delete modal
11. `11-bookmark-list-with-dash-separators.png` - bookmark rendering
12. `12-mobile-overlay-mode.png` - mobile (<768) overlay behavior

## Manual Regression Checklist

## Shell and navigation

- [ ] Top bar renders logo/search/panel toggles without layout shift.
- [ ] Left panel toggle hides/shows sidebar.
- [ ] Right panel toggle hides/shows inspector.
- [ ] Desktop separators remain draggable and no dead zones.

## Tree interactions

- [ ] `Expand All` and `Collapse All` work for all visible branches.
- [ ] Per-node expand/collapse chevrons work recursively.
- [ ] Node selection updates right panel content.
- [ ] Switching `Classic`/`Compact lanes` keeps same selected node.

## Current sequence path

- [ ] Full path appears as call-call-call-... line above table.
- [ ] Every call chip is clickable and navigates to exact prefix node.
- [ ] Missing node in path is visually disabled.

## Add continuation form

- [ ] Popup opens from row plus icon and closes on Cancel/Escape.
- [ ] Bids lower/equal than last contract are disabled (dimmed).
- [ ] `Pass`, `X`, `XX` availability follows current sequence context.
- [ ] Manual text entry normalizes call (`2h` -> `2H`, suit icons -> letters).

## Delete behavior

- [ ] Custom delete dialog appears (no browser prompt).
- [ ] Descendant count is shown before confirm.
- [ ] Confirm removes node and descendants, cancel leaves data unchanged.

## Right panel editing

- [ ] `Forcing` options are English labels:
  - `NF - no forcing`
  - `INV - invite`
  - `F1 - forcing round`
  - `FG - forcing game`
  - `SL - slam try`
- [ ] Notes, HCP, shape fields update live.
- [ ] Comments/replies add/delete still works.

## Bookmark and left panel

- [ ] Bookmark entries render sequence with `-` separators.
- [ ] Bookmark click selects corresponding node in center tree.
- [ ] Empty bookmark state still displays.

## Non-regression acceptance

- [ ] All scenarios above pass in desktop and mobile widths.
- [ ] No new scrollbars appear in add continuation form.
- [ ] No console runtime errors while executing checklist.
