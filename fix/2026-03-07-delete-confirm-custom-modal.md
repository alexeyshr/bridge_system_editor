## Fix: replaced browser delete confirm with custom modal

- Date: 2026-03-07

### Symptom

Deleting a bid used the default browser confirm dialog (`confirm(...)`), which looked out of style and inconsistent with the app UI.

### Change

1. Removed native confirm from `components/SequenceRow.tsx`.
2. Added a custom confirmation modal with:
   - sequence preview,
   - warning text,
   - continuation count,
   - `Cancel` and `Delete` actions,
   - backdrop click to close.

### Result

Delete flow now uses an in-app styled confirmation form and matches the interface design.
