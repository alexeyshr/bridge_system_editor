# F06 Import/Export Migration

Date: 2026-03-07
Scope: `specs/004-left-panel-evolution/06-import-export-migration.md`

## What was fixed

- Added schema export format with `schemaVersion: 2` as default.
- Added legacy export mode behind `exportYaml({ legacy: true })`.
- Extended import parser:
  - legacy array input supported;
  - wrapped legacy payload (`data: []`) supported;
  - schema object payload supported.
- Added sanitization on import for broken references:
  - invalid section/node links are dropped;
  - broken section parent links are rewired to root;
  - invalid rules/custom smart views are dropped with warnings.

## Validation

- `npm run typecheck`
- `npm run test`
- `npm run build`
