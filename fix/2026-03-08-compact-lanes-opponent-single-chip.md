## Bug

In compact mode for competitive sequences, our calls could be visually placed as if they belong to opener only.

## Requested behavior

- Our calls in compact mode should follow `Opener/Responder` alternation.
- Opponent calls should be shown as a single compact chip, not via two-lane O/R slots.

## Fix

Updated compact rendering in `SequenceRow`:

1. Our calls:
   - lane is computed by index of our turns in sequence (`1st our = opener`, `2nd our = responder`, etc.)
2. Opponent calls:
   - rendered as one gray chip `(call)` with no two-lane split.

## Validation

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
