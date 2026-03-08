# Left Panel Feature Plan

Scope: expand the left panel into a flexible navigation and organization area without breaking the current center tree and right card flows.

## Architecture References

- ADR: `docs/adr/ADR-0001-api-first-modular-monolith.md`
- C4: `docs/c4/c3-components-webapp.mmd`

## Linear Scope

- Parent: `BRI-33`
- Mapping: `specs/004-left-panel-evolution/linear-mapping.md`

## Delivery Order

1. `01-sections-data-model.md` - section entities and store state
2. `02-sections-crud-ui.md` - section list/tree and CRUD controls
3. `03-node-section-assignment.md` - assign node/subtree to sections
4. `04-smart-views.md` - built-in and custom smart views
5. `05-primary-filter-integration.md` - filter center tree by section/smart view
6. `06-import-export-migration.md` - persist in YAML/JSON and migrate old files
7. `07-store-method-mapping.md` - exact changes for existing store methods
8. `08-performance-indexing.md` - indexing and recompute strategy
9. `09-qa-acceptance.md` - test matrix and release checklist

## Locked Decisions

- Smart views in MVP: built-in + custom
- Export format: schema-based with `schemaVersion`
- Subtree assignment default: include future descendants
- Delete section behavior: move child sections to parent
- Left panel language: English-only for now

## Board

- [x] F01 Sections data model
- [x] F02 Sections CRUD UI
- [x] F03 Node assignment to sections
- [x] F04 Smart views
- [x] F05 Primary filter integration
- [x] F06 Import/export migration
- [x] F07 Store method mapping
- [x] F08 Performance and indexing
- [x] F09 QA and acceptance

## Notes

- Keep center and right panels unchanged unless required by left panel integration.
- No destructive edits to existing bidding nodes when section data changes.
- Each completed task should include a fix note in `/fix`.
