# F01 Sections Data Model

## Goal

Add user-defined sections (including nested sections) to the store model.

## Scope

- Add `sectionsById` and `sectionRootOrder`.
- Add section metadata: `id`, `name`, `parentId`, `order`, timestamps.
- Add initial left-panel selection state: `leftPrimaryMode`, `activeSectionId`, `activeSmartViewId`.

## Out of Scope

- UI rendering and interaction details.
- Node assignment logic.

## Implementation Tasks

1. Extend `useBiddingStore` state types.
2. Add store actions for creating/renaming/moving/deleting sections.
3. Enforce basic validation rules (name required, name length, duplicate within same parent).
4. Add helper selectors for section tree and section paths.

## Done Criteria

- Creating section in store works with root and nested parent.
- Reorder and move keep stable order values.
- Deleting section does not delete bidding nodes.
- TypeScript compiles without `any` fallback in new section state.
