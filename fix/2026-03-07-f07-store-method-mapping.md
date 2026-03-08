# F07 Store Method Mapping

Date: 2026-03-07
Scope: `specs/004-left-panel-evolution/07-store-method-mapping.md`

## What was fixed

- `addNode` extended:
  - keeps previous behavior;
  - auto-assigns active section directly when user adds node in section-filter mode.
- `renameNode` and `deleteNode` cleanup/remap paths preserved and validated with section/rule maps.
- `importYaml` and `exportYaml` aligned with method mapping requirements for legacy + v2 schema behavior.

## Validation

- Added tests for:
  - auto-assignment on `addNode` in section mode;
  - v2 export/import roundtrip;
  - legacy import/export compatibility.
- `npm run typecheck`
- `npm run test`
