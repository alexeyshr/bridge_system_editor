# F02 Sections CRUD UI

## Goal

Render a dedicated `Sections` block in the left panel with CRUD actions and nested structure.

## Scope

- Add `SECTIONS` block below `Roots`.
- Render nested rows with chevron, name, count, and hover actions.
- Add section create/rename/delete flows.
- Add collapse/expand state for section tree.

## Out of Scope

- Assignment from nodes to sections.
- Smart views.

## Implementation Tasks

1. Build `SectionsPanel` component.
2. Add row context menu (`Open`, `Rename`, `New subsection`, `Delete`).
3. Add create and rename modals.
4. Add empty state (`No sections yet` + create CTA).
5. Connect to store actions from F01.

## Done Criteria

- User can create root and nested sections from UI.
- User can rename and delete a section.
- Section row expansion/collapse persists while app is open.
- Left panel remains responsive at 100+ sections.
