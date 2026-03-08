# CURRENT_WORK

Updated: 2026-03-09 02:29 +03:00

## Active Context

- Main spec in progress: `specs/008-systems-lifecycle-and-tournament-usage`
- Current phase status:
  - F01: done
  - F02: done
  - F03: done
  - F04: implemented on branch `codex/spec-008-f04-tournament-bindings` (pending merge to `main`)
  - F05: done (`codex/BRI-63-f05-template-profiles`)
  - F06: done (`codex/BRI-63-f05-template-profiles`)

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
- Branch: `codex/spec-008-f04-tournament-bindings`
- Commits:
  - `02d29bf` feature implementation
  - `9ae26cb` process log update
  - `8210681` spec PR-note
- Status: implemented and pushed, pending merge

### F05 Template Profiles

- Start: 2026-03-09 02:07
- End: 2026-03-09 02:21
- Branch: `codex/BRI-63-f05-template-profiles`
- Linear: `BRI-63` moved to `In Progress`
- Commit: `60b2237`
- Result:
  - Added template profiles (`Standard`, `2/1`, `Precision`) in `lib/system-templates.ts`.
  - Extended create-system contracts with optional `templateId`.
  - Seeded template nodes in Drizzle `createSystemForUser`.
  - Added template selector to Systems Hub create flow.
  - Added template unit tests + router forwarding test + parity template seed test.
  - Full quality gate green (`lint`, `typecheck`, `test`, `build`).

### F06 Acceptance + Documentation

- Start: 2026-03-09 02:22
- End: 2026-03-09 02:29
- Branch: `codex/BRI-63-f05-template-profiles`
- Commit: pending
- Result:
  - Updated `docs/ROADMAP.md` and `docs/bounded-contexts.md` for lifecycle/templates coverage.
  - Added rollout and migration constraints note:
    - `specs/008-systems-lifecycle-and-tournament-usage/rollout-notes.md`
  - Updated spec package index:
    - `specs/008-systems-lifecycle-and-tournament-usage/README.md`
  - Marked F06 tasks as complete in `specs/008.../tasks.md`.

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

- Open PR for `codex/BRI-63-f05-template-profiles`, attach spec links and test evidence.
- After merge, move `BRI-63` to `Done` and start next `Now` item from `specs/009-collaboration-discussions-and-sharing`.

## Branching Rule (effective immediately)

- No more direct implementation on `main`.
- Next implementation starts from a dedicated branch:
  - `codex/BRI-63-f05-template-profiles` for current phase.
