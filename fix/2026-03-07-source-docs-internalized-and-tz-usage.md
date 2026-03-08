# 2026-03-07 - Source Docs Internalized and TZ Usage

## Summary

Moved strategic source documents into the repository and documented practical TZ usage in the execution workflow.

## Changes

1. Added source copies:
   - `docs/source/IDEAS.md`
   - `docs/source/PRIORITIES.md`
   - `docs/source/TZ.md`
2. Updated context references:
   - `docs/IDEA_CONTEXT.md`
   - `docs/ROADMAP.md`
   - `docs/IDEAS_SECTION_INDEX.md` source pointer
3. Added `docs/TZ_USAGE.md` with clear rules:
   - TZ as context,
   - implementation only through SDD + ADR when needed.

## Why

Keep all strategic artifacts versioned in one repo and avoid ambiguity about how TZ should be used during implementation.
