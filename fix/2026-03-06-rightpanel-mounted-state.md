## Fix: react-hooks/set-state-in-effect (mounted)

- Date: 2026-03-06
- File: `components/RightPanel.tsx`
- Error: `react-hooks/set-state-in-effect` on `setMounted(true)` inside `useEffect`.

### Root Cause
`mounted` state was updated synchronously in `useEffect` only to gate timestamp rendering.

### Change
Removed `mounted` state and replaced timestamp rendering with deterministic formatter:
- `formatTimestamp(timestamp)` -> `toISOString().replace('T', ' ').slice(0, 16)`

### Result
Lint error removed; timestamps still render safely without effect-driven state update.
