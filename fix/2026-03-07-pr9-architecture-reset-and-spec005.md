# PR-9 Architecture Reset and specs/005 Bootstrap

Date: 2026-03-07
Scope: planning, architecture decisions, SDD package bootstrap

## What was done

- Added ADR draft set for next architecture cycle:
  - `ADR-0003` Drizzle-only cutover.
  - `ADR-0004` Zustand slice architecture.
  - `ADR-0005` auth migration decision gate.
  - `ADR-0006` PostgreSQL search/index-first strategy.
  - `ADR-0007` SSE notifications transport.
  - `ADR-0008` observability/protection baseline.
- Created new SDD package:
  - `specs/005-platform-core-hardening/spec.md`
  - `specs/005-platform-core-hardening/plan.md`
  - `specs/005-platform-core-hardening/tasks.md`
  - `specs/005-platform-core-hardening/linear-mapping.md`
  - `specs/005-platform-core-hardening/README.md`
- Updated roadmap and project entrypoints to mark `specs/005` as current implementation stream.

## Why

- `specs/004` (left-panel evolution) is complete.
- Next cycle needs architecture simplification before feature expansion for portal scale.
