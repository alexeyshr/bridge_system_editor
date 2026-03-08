# Feature: Actor-Aware Sequence Model (Our/Opponent)

Date: 2026-03-08

## What was implemented

- Introduced actor-aware step model for bidding sequence:
  - `context.sequence: Array<{ call, actor }>`
  - actor values: `our` / `opp`
- Internal node id changed to actor-aware token path:
  - `o:<CALL>` / `p:<CALL>` tokens, space-separated
  - example: `o:1C p:1D o:1H`

## UI changes

- Add continuation popup now has actor switch:
  - `Our call`
  - `Opponent call`
- Opponent calls are visually distinct in UI:
  - rendered with parentheses `(1♠)`
  - muted style
- Current sequence / row sequence / right panel sequence updated for actor-aware rendering.

## Smart Views

Added built-ins:
- `Competitive only` (contains both `our` and `opp` steps)
- `Has opponent action` (contains at least one `opp` step)

## Migration compatibility

- Legacy ids and sequence arrays are normalized automatically:
  - old ids like `1C 1D` become canonical actor-aware ids
  - old `context.sequence: string[]` is converted to object steps (`our` by default)
- Legacy references (`nodeSectionIds`, subtree rules, touched map) are canonicalized.

## Validation

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
