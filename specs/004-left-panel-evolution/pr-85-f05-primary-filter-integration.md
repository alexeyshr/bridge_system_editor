# PR-85: F05 Primary Filter Integration

## PR Title

`feat(left-panel): F05 primary filter integration (BRI-38)`

## PR Body

```md
## Summary

Integrate left-panel primary filters (section/smart view) into center tree rendering with ancestor-preserving display and clear filter controls.

## Spec Link

- specs/004-left-panel-evolution/05-primary-filter-integration.md

## Architecture Impact

- [x] No architecture impact (ADR update not required)
- [ ] Architecture changed or extended; ADR link added here:

## Scope

- In scope:
  - store selectors `getPrimaryMatchedNodeIds` and `getDisplayNodeIdsWithAncestors`
  - center tree filtering by active section or active smart view
  - ancestor inclusion for matched nodes
  - active filter chip (`Section: ...` / `Smart: ...`) with clear action
  - auto-expand paths to matched nodes during active filter
- Out of scope:
  - import/export schema migration (F06)
  - performance indexing optimizations (F08)

## Acceptance Criteria

- [x] Section click applies section filter in center tree
- [x] Smart view click applies smart filter in center tree
- [x] Matching nodes are shown with ancestors
- [x] Clearing filter restores full unfiltered tree

## Test Evidence

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- Manual checks performed:
  - section filter selection and clear
  - smart view filter selection and clear
  - breadcrumb and expand/collapse behavior under active filter

## Risks / Migration Notes

- Selector logic is currently in Zustand store and recomputed per render; dedicated indexing is planned in F08.
```

## PR Link

- Create/Open PR: https://github.com/alexeyshr/bridge_system_editor/pull/new/codex/BRI-38-f05-primary-filter-integration

## Linear Link

- https://linear.app/bridgespace/issue/BRI-38/pr-85-f05-primary-filter-integration

## Local Checks

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅
