## Change

Added edit capability for entries in `Sequence / Opp roots`.

## UX

- Each sequence/opponent root entry now has an `Edit` (pencil) action.
- Edit opens `Add/Edit root entry` modal in `Sequence` mode with current path prefilled.
- User can change calls/actors and save.

## Behavior

- Save updates root entry target to new sequence.
- If target sequence does not exist yet, missing path nodes are created.
- Existing root-entry conflict is validated.
- Existing delete behavior remains unchanged.

## Validation

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
