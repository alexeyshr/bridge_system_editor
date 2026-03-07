# PR-86: F06 Import/Export Migration

## PR Link

- https://github.com/alexeyshr/bridge_system_editor/pull/TBD

## PR Title

`feat(left-panel): add schemaVersion=2 import/export migration with legacy compatibility`

## PR Body

### Spec Link

- `specs/004-left-panel-evolution/06-import-export-migration.md`

### Scope

- Add default export schema object with `schemaVersion: 2`
- Keep legacy export format only via explicit option
- Extend import parser to support legacy + v2 payloads
- Sanitize invalid references on import and report warnings

### Out of Scope

- External storage or backend migration jobs

### Acceptance Criteria

- Legacy files load without crash
- V2 roundtrip keeps sections/memberships/rules/smart-views
- Invalid references are dropped safely with warnings

### Test Evidence Required

- `npm run typecheck`
- `npm run test`
- `npm run build`
