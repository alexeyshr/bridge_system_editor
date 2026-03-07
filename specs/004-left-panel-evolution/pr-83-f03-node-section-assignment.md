# PR-83: F03 Node Section Assignment

## PR Title

`feat(left-panel): F03 node section assignment (BRI-36)`

## PR Body

```md
## Summary

Implement node-to-section assignment and subtree section rules for left panel evolution.

## Spec Link

- specs/004-left-panel-evolution/03-node-section-assignment.md

## Architecture Impact

- [x] No architecture impact (ADR update not required)
- [ ] Architecture changed or extended; ADR link added here:

## Scope

- In scope:
  - direct node membership in one or more sections
  - subtree assignment rules from a node root (future descendants included by default)
  - assignment UI from sequence row and right panel card
  - cleanup/remap of assignments on node rename/delete and section delete
- Out of scope:
  - smart views and primary filter integration (F04/F05)

## Acceptance Criteria

- [x] One node can belong to multiple sections
- [x] Subtree assignment includes existing descendants
- [x] Future descendants are included by default
- [x] Deleting a section removes related memberships/rules safely

## Test Evidence

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- Manual checks performed:
  - node assignment available from row action popover
  - node assignment available from right panel card
  - subtree rules visible and removable

## Risks / Migration Notes

- Assignment model is local-store based in this step; server persistence integration remains in later steps.
```

## PR Link

- Create/Open PR: https://github.com/alexeyshr/bridge_system_editor/pull/new/codex/BRI-36-f03-node-section-assignment

## Linear Link

- https://linear.app/bridgespace/issue/BRI-36/pr-83-f03-node-section-assignment

## Local Checks

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅
