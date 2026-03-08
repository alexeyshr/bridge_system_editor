# 2026-03-08 PR-10.1 Safe Mutation Intents

## What was wrong
Delete-like actions in UI used overlapping wording and behavior across different contexts:
- delete bidding node/subtree (destructive)
- remove root entry link (non-destructive)
- remove section assignment / subtree rule (non-destructive)

This increased risk of accidental destructive operations and made behavior hard to reason about.

## Root cause
We had no explicit mutation intent layer. UI labels, confirm texts, and button styles were composed ad hoc in each component, so intent could drift.

## Fix implemented
- Added central intent taxonomy in `lib/domain/bidding/mutation-intents.ts`.
- Wired dialogs in:
  - `components/SequenceRow.tsx`
  - `components/LeftPanel.tsx`
  - `components/NodeSectionAssignment.tsx`
- Enforced non-destructive wording for remove operations ("Remove"), destructive wording for delete operations ("Delete").
- Added regression test:
  - `tests/sections-data-model.test.ts`
  - verifies removing section links/subtree rules does not delete bidding nodes.

## Why this should not regress
- Intent metadata is centralized and reused.
- Regression test covers remove-vs-delete safety semantics.
- F01 tasks marked complete in `specs/007-editor-surface-v2/tasks.md`.

## Prevention rule
For every new mutation action:
1. Add/confirm intent type in `mutation-intents.ts`.
2. Use intent meta in dialog copy and button styling.
3. Add a store-level regression test for data-retention semantics.
