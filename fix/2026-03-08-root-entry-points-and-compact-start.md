## Context

Requested behavior update for `Roots`:
- allow root items to be full sequences (not only single bid nodes),
- allow opponent actions to be used as root entry points,
- in `Compact lanes` start rendering from children of selected root entry.

## What was changed

1. Introduced dedicated `root entries` model in store:
   - `rootEntryNodeIds`
   - `activeRootEntryNodeId`
2. Added store actions:
   - `addRootEntry`
   - `removeRootEntry`
   - `setActiveRootEntryNodeId`
3. Added migration/persistence for root entries in:
   - draft payload
   - YAML export/import schema payload
   - remote hydration reset
4. Updated roots filtering logic to work from active root entry subtree.
5. Updated `LeftPanel`:
   - roots now read from explicit root-entry list,
   - modal supports adding opponent top-level roots,
   - modal supports adding currently selected sequence as root entry,
   - deleting sequence roots removes only entry (no data loss),
   - deleting top-level roots keeps previous subtree-delete behavior.
6. Updated `CenterPanel` + `SequenceRow`:
   - relative depth rendering from selected root entry,
   - in `Compact lanes` selected root row is hidden and display starts from continuations.

## Validation

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed (including new root-entry tests)
