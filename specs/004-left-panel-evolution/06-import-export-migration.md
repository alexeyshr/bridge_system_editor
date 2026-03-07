# F06 Import/Export Migration

## Goal

Persist left-panel data in project files and support backward compatibility.

## Scope

- Export sections, memberships, subtree rules, and smart views.
- Import files with and without the new schema.
- Migration path from legacy format.
- Default export format is schema-based with `schemaVersion`.

## Out of Scope

- External storage service integration.

## Implementation Tasks

1. Add `schemaVersion` and section payload to export.
2. Extend import parser to detect legacy vs v2.
3. Add migration defaults for missing fields.
4. Validate references (`sectionId`, `nodeId`) during import and clean orphan data.

## Done Criteria

- Legacy files load without crash.
- New files keep section state after roundtrip import/export.
- Invalid references are dropped safely with warning in console.
