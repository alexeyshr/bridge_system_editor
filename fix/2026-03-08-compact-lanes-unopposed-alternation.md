## Bug

In unopposed auctions, `Compact lanes` showed all bids on one lane and dots on the other lane.

## Root cause

Lane placement relied only on `actor` (`our|opp`).  
For unopposed trees all steps are `our`, so compact mode placed every bid on the same lane.

## Fix

Updated compact lane rendering logic in `SequenceRow`:
- if sequence has opponent actions: keep actor-based mapping (`our/opp`),
- if sequence is unopposed: map lanes by parity (`Opener/Responder` alternating by depth).

Also updated lane labels in compact mode:
- unopposed: `Opener` / `Responder`,
- competitive: `Our side` / `Opponent`.

## Validation

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
