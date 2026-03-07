## Fix: hybrid save flow (auto-draft + explicit file save)

- Date: 2026-03-07

### Goal

Avoid losing edits while keeping explicit user-controlled file saving.

### Changes

1. Added auto-draft persistence in `localStorage` (`bridge-system-editor:draft:v1`).
2. Added store save status fields:
   - `hasUnsavedChanges`
   - `isDraftSaving`
   - `lastDraftSavedAt`
   - `lastExportedAt`
3. Data-changing actions now mark unsaved state and schedule draft save.
4. `Export` action now acts as explicit save-to-file:
   - clears unsaved flag
   - records `lastExportedAt`
5. Added tab-close warning:
   - shows browser leave warning when there are unsaved file changes
   - flushes draft save on `beforeunload`
6. Updated top bar UX:
   - status indicator (`Unsaved changes`, `Saving draft...`, `Draft saved`, `File saved`)
   - button label changed from `Export` to `Save`

### Result

- Drafts are auto-preserved between reloads.
- Users keep explicit control over official file save (`Save` button).
- Risk of accidental data loss is significantly reduced.
