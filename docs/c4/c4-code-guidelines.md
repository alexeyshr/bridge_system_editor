# C4 Level 4 (Code) Guidelines

Last updated: 2026-03-07

The project does not require full class diagrams for every feature.  
Use C4 Code-level detail only for high-risk or non-obvious modules.

## When to Create Code-Level Diagrams

- Complex domain validation (for example legal continuation generation).
- Security-sensitive flows (auth, invite acceptance, permission checks).
- Cross-driver behavior that must stay parity-safe (Prisma vs Drizzle).
- Critical performance paths where caching/indexing strategy matters.

## Minimum Content for C4-Code Notes

1. Entry points:
   - API procedures or UI actions that start the flow.
2. Core types/functions:
   - main service method(s),
   - validation and mapping functions,
   - repository calls.
3. Invariants:
   - rules that must always hold.
4. Failure modes:
   - expected errors and fallback behavior.

## Folder Conventions

- `lib/domain/**`: pure domain rules and contracts.
- `lib/server/**`: application services and driver orchestration.
- `lib/db/**`: persistence adapters only.
- `hooks/**`: client sync orchestration.
- `store/**`: UI-local state and interaction toggles.

## Rule of Thumb

If a new contributor cannot explain a module boundary in 2 minutes, add a short code-level note or diagram before expanding implementation.
