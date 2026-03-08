## Change

Updated `Add root entry` modal with a mode switch:
- `Single bids` mode for bulk top-level roots
- `Sequence` mode for building a full sequence step-by-step

## Details

1. Added explicit mode toggle in root picker modal.
2. Added sequence builder UI:
   - next actor toggle (`Our` / `Opp`)
   - sequence preview
   - `Undo` and `Clear`
   - bid + special calls availability checks (`Pass`, `X`, `XX`)
3. Sequence submit now:
   - creates missing nodes in path,
   - adds final node as root entry.
4. Existing “Use selected sequence” flow kept in single mode.

## Validation

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
