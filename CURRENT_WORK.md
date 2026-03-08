# CURRENT_WORK

Updated: 2026-03-09 01:38 +03:00

## Active Context

- Main spec in progress: `specs/008-systems-lifecycle-and-tournament-usage`
- Current phase status:
  - F01: done
  - F02: done
  - F03: done
  - F04: done

## Timeline (MSK, +03:00)

> Start times for completed phases are estimated from commit sequence. End times are exact commit times.

### F01 Data Model + Contracts

- Start (estimated): 2026-03-08 23:35
- End: 2026-03-09 00:43
- Commit: `3a64413`
- Result: schema + migrations + lifecycle/binding contracts + tests.

### F02 Systems Hub

- Start (estimated): 2026-03-09 00:44
- End: 2026-03-09 00:58
- Commit: `535f426`
- Result: systems hub UI, filters, open-system flow, tests.

### F03 Draft/Published Lifecycle

- Start (estimated): 2026-03-09 00:59
- End: 2026-03-09 01:15
- Commit: `b7a557c`
- Result: publish/compare/create-draft UI + compare endpoint + tests.

### F04 Tournament Usage Binding

- Start: 2026-03-09 01:17
- End: 2026-03-09 01:38
- Commit: pending
- Result:
  - Added remove/freeze-tournament binding contracts in service/router/validation.
  - Added Drizzle transition checks for frozen bindings (no update/remove on frozen).
  - Added lifecycle menu binding UI (bind, freeze, remove, freeze all by tournament).
  - Added router + parity tests for binding transitions.

### Process Reset

- Start: 2026-03-09 01:19
- End: 2026-03-09 01:23
- Result:
  - Added strict process contract in `docs/PROCESS.md`.
  - Confirmed next work must run through: Linear issue -> branch -> PR -> merge.

## Why process drift happened

1. Work was pushed directly to `main` because we stayed in execution mode after prior `main`-first requests.
2. Linear was not updated per phase in lockstep while code was moving quickly.
3. Feature branches/PR-per-phase were skipped to keep momentum, but this reduced process visibility.

## Process from now (strict)

For every next phase/subphase:

1. Create/confirm Linear issue (status `In Progress`).
2. Create branch `codex/<issue-or-phase>`.
3. Implement + tests.
4. Open PR with spec links.
5. Update Linear:
   - Acceptance Criteria
   - Test Evidence
   - Definition of Done
   - move to `Done` only after merge.
6. Merge to `main`.
7. Update this file (`CURRENT_WORK.md`) with start/end + result.

## Immediate next step

- F05 / T1140-T1142:
  - template profiles (`Standard`, `2/1`, `Precision`),
  - create-system-from-template flow,
  - template generation tests,
  - Linear + PR tracking in strict mode.

## Branching Rule (effective immediately)

- No more direct implementation on `main`.
- Next implementation starts from a dedicated branch:
  - `codex/spec-008-f04-tournament-bindings` (or Linear-based equivalent).
