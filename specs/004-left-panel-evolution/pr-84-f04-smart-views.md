# PR-84: F04 Smart Views

## PR Title

`feat(left-panel): F04 smart views (BRI-37)`

## PR Body

```md
## Summary

Implement smart views in the left panel (built-in + custom), with live counters, pin/unpin ordering, and center tree filtering by selected smart view.

## Spec Link

- specs/004-left-panel-evolution/04-smart-views.md

## Architecture Impact

- [x] No architecture impact (ADR update not required)
- [ ] Architecture changed or extended; ADR link added here:

## Scope

- In scope:
  - built-in smart views (`Unassigned`, `Bookmarked`, `No notes`, `Unaccepted`, `Recently edited`)
  - custom smart views by query (`name`, `query`, `field`)
  - smart view counters and pin/unpin in left panel
  - selecting smart view filters center tree
  - active smart filter chip with clear action in center panel
- Out of scope:
  - deep query builder UI
  - section-based filtering integration with ancestor-preserving render (F05)

## Acceptance Criteria

- [x] Built-in smart views are always available
- [x] Clicking a smart view filters center tree
- [x] Smart view counters update immediately after edits
- [x] Pin/unpin affects ordering

## Test Evidence

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- Manual checks performed:
  - create/edit/delete custom smart view from left panel
  - select built-in smart view and verify filtered center list
  - clear active smart filter chip in center panel

## Risks / Migration Notes

- Smart view data is currently persisted in local draft state; API/export schema migration is in later steps (F06/F07).
```

## PR Link

- Create/Open PR: https://github.com/alexeyshr/bridge_system_editor/pull/new/codex/BRI-37-f04-smart-views

## Linear Link

- https://linear.app/bridgespace/issue/BRI-37/pr-84-f04-smart-views

## Local Checks

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅
