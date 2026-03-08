# 2026-03-07 - F01 Sections Data Model

## Summary

Implemented the first left-panel evolution milestone: sections data model in the store with typed actions and selectors.

## Implemented

1. Store state:
   - `sectionsById`
   - `sectionRootOrder`
   - `leftPrimaryMode`
   - `activeSectionId`
   - `activeSmartViewId`
2. Section actions:
   - `createSection`
   - `renameSection`
   - `moveSection`
   - `reorderSection`
   - `deleteSection`
3. Validation:
   - non-empty section name
   - max length guard
   - duplicate name blocking within the same parent
   - move safety checks (no self/descendant target)
4. Helper selectors:
   - `getSectionChildren`
   - `getSectionTree`
   - `getSectionPath`
5. Draft persistence:
   - sections and left-panel selection state are now included in local draft payload.
6. Regression safety:
   - deleting a section does not delete bidding nodes.
   - deleting a section re-parents child sections to the deleted section parent.

## Tests

Added store-level tests:
- `tests/sections-data-model.test.ts`
