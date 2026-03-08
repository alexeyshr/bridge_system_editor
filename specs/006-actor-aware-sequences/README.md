# 006: Actor-Aware Sequences (Our/Opponent)

## Goal

Support competitive bidding by storing each step as:

```ts
{ call: string; actor: 'our' | 'opp' }
```

and using actor-aware internal sequence ids to prevent collisions.

## Key Decisions

- Node path id is actor-aware token chain:
  - `our` step token: `o:<CALL>`
  - `opp` step token: `p:<CALL>`
  - full id example: `o:1C p:1D o:1H p:1S`
- Legacy ids like `1C 1D 1H` are accepted on import and converted to actor-aware ids (`our` by default).
- Legacy sequence strings in payload are accepted and converted to object steps.

## UI Scope

1. Add-continuation form
- Add actor switch buttons: `Our call` / `Opponent call`.
- New continuation uses selected actor.

2. Visual representation
- Opponent calls rendered differently:
  - wrapped in parentheses (e.g. `(1♠)`)
  - muted color style.

3. Smart Views
- Add built-ins:
  - `Competitive only`: sequence contains both actors.
  - `Has opponent action`: sequence contains at least one opponent step.

## Data Migration Rules

- Import / hydration normalization supports:
  - `context.sequence: string[]` (legacy)
  - `context.sequence: Array<{ call, actor }>` (new)
  - id tokens with and without actor prefix.
- Old references in `nodeSectionIds`, `subtreeRulesById`, `nodeTouchedAtById` are canonicalized to actor-aware ids.

## Non-Goals (MVP)

- No strict turn-order validator yet.
- No separate opponent root creation flow (ROOTS picker remains our-side oriented).

## Acceptance Criteria

- Can add `our` and `opp` continuations under the same parent call without id collisions.
- Opponent steps are visually distinct in center/right/current-sequence displays.
- Existing systems (legacy sequence format) load without data loss.
- Smart views `Competitive only` and `Has opponent action` are selectable and counted.
