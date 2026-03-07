# PR-88: F08 Performance and Indexing

## PR Link

- https://github.com/alexeyshr/bridge_system_editor/pull/new/codex/BRI-39-f06-to-f08-batch

## PR Title

`perf(left-panel): add memoized indexes and cached counters for sections and smart views`

## PR Body

### Spec Link

- `specs/004-left-panel-evolution/08-performance-indexing.md`

### Scope

- Add memoized derived indexes for rules/parents/section children/effective sections
- Add cached smart-view counters
- Switch hot selectors to indexed paths
- Use section node counters in left-panel section badges

### Out of Scope

- Virtualized rendering

### Acceptance Criteria

- Section/smart-view filtering remains responsive on large trees
- Counters are computed via cache in hot paths
- No regressions in existing tree/card flows

### Test Evidence Required

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
