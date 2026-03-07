# Spec: PR-5 Client Migration to tRPC (Preserve Existing UI)

Feature ID: `pr5-trpc-client-preserve-ui`  
Date: 2026-03-07  
Status: Draft for implementation

## Architecture References

- ADR: `docs/adr/ADR-0001-api-first-modular-monolith.md`
- ADR: `docs/adr/ADR-0002-drizzle-trpc-default-stack.md`
- C4: `docs/c4/c2-container.mmd`
- C4: `docs/c4/c3-components-webapp.mmd`
- C4: `docs/c4/c3-components-api.mmd`

## Context

Server-side foundation is already in place:
- Drizzle/Prisma dual drivers with `DB_DRIVER`
- tRPC server router and endpoint `/api/trpc`

Current client still relies on local Zustand-only state for core data lifecycle.  
Goal of PR-5 is to migrate client data flow to tRPC without changing UX behavior of tree/card/panels.

Linear scope:
- `BRI-21` parent
- `BRI-22` provider in app shell
- `BRI-23` store sync hooks to tRPC queries/mutations
- `BRI-24` UI non-regression validation

## Problem Statement

Client and server are partially migrated and currently disconnected.  
Without tRPC client integration, autosave and collaborative persistence cannot use the new backend reliably.

## Goals

- Add tRPC + React Query provider to app shell.
- Add client API layer based on typed tRPC hooks.
- Refactor store synchronization to read/write via tRPC while preserving current UI interactions.
- Validate no regression against frozen UI baseline.

## Non-Goals

- No redesign of left/center/right UI.
- No removal of REST endpoints in PR-5.
- No Prisma removal/cutover (reserved for PR-7).

## Functional Acceptance Criteria

- AC-01: App shell provides `QueryClient` and tRPC client to all interactive pages.
- AC-02: System loading path can use tRPC query (`bidding.systems.*`) without breaking current selection flow.
- AC-03: Node synchronization path uses tRPC mutation with existing optimistic/local UX semantics.
- AC-04: Existing controls continue to work (panels collapse/resize, tree expand/collapse, add/edit/delete dialogs).
- AC-05: UI baseline checklist `tests/ui-baseline/bidding-module-regression.md` passes manually.
- AC-06: `lint`, `typecheck`, `test`, `build` all pass.

## Constraints

- Preserve existing store shape until migration stabilizes.
- Keep dual path optionality where needed via flags and adapter functions.
- Avoid introducing blocking loading states that degrade editor responsiveness.

## Risks

- Risk: hydration or provider wiring regressions in layout.
  - Mitigation: client-only provider component and no server-only imports in runtime path.
- Risk: store and tRPC update loops.
  - Mitigation: explicit sync boundaries and controlled mutation triggers.
- Risk: accidental UI behavior drift.
  - Mitigation: baseline checklist execution (`BRI-24`) before merge.

## Exit Criteria

- `BRI-22` and `BRI-23` implemented with test/build green.
- `BRI-24` checklist executed and attached as evidence.
- `BRI-21` can be closed.
