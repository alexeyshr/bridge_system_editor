# PR-87: F07 Store Method Mapping

## PR Link

- https://github.com/alexeyshr/bridge_system_editor/pull/TBD

## PR Title

`feat(left-panel): complete store method mapping for add/import/export consistency`

## PR Body

### Spec Link

- `specs/004-left-panel-evolution/07-store-method-mapping.md`

### Scope

- Extend `addNode` with section-context direct assignment behavior
- Keep rename/delete map remapping behavior consistent with section/rule state
- Align import/export method behavior with mapping and backward compatibility

### Out of Scope

- UI redesign beyond required behavior

### Acceptance Criteria

- New nodes created in section filter context appear in that section
- Existing rename/delete behavior does not regress
- Legacy import/export behavior remains supported

### Test Evidence Required

- `npm run typecheck`
- `npm run test`
