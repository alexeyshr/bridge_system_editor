## Fix: react-hooks/set-state-in-effect (local sync)

- Date: 2026-03-06
- File: `components/RightPanel.tsx`
- Error: `react-hooks/set-state-in-effect` on `setLocalCall(lastCall)` in `useEffect`.

### Root Cause
Legacy local rename synchronization logic remained in component, but related rename UI handlers were no longer used.

### Change
Removed unused rename-related local state and handlers:
- Removed `localCall` state
- Removed sync effect that called `setLocalCall(...)`
- Removed dead handlers (`handleRename`, `handleCallBlur`, `handleCallKeyDown`)
- Kept comment reply reset behavior without effect by storing `{ nodeId, commentId }` in state.

### Result
Lint error removed and component logic simplified without functional regression for comments UI.
