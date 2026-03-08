# Spec: PR-11 Systems Lifecycle and Tournament Usage

Feature ID: `pr11-systems-lifecycle-and-tournament-usage`  
Date: 2026-03-08  
Status: Draft for implementation

## Architecture References

- ADR: `docs/adr/ADR-0001-api-first-modular-monolith.md`
- ADR: `docs/adr/ADR-0002-drizzle-trpc-default-stack.md`
- ADR: `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`

## Context

Editor CRUD is only one part of the portal. The platform needs lifecycle controls around many systems, immutable published versions, and deterministic tournament bindings.

## Problem Statement

A single mutable system model is not enough for portal workflows:
- no trusted "published" baseline,
- no reproducible tournament usage,
- no clear flow between working draft and shared stable version.

## Goals

- Add Systems Hub above EditorSurface.
- Implement Draft/Published lifecycle with immutable versions.
- Implement compare and rollback (`Create draft from version`).
- Bind tournament usage to `systemId + versionId`.
- Support pair/team-level binding and freeze rules.
- Preserve existing editor UI as editing surface.

## Non-Goals

- No full tournament scoring engine in this spec.
- No cross-system analytics engine in this phase.
- No hard requirement for public marketplace features.

## Functional Acceptance Criteria

- AC-01: User can list/search/filter owned/shared systems in Systems Hub.
- AC-02: Editor opens a mutable draft context for selected system.
- AC-03: Publish action creates immutable version snapshot with metadata.
- AC-04: User can compare draft vs selected published version.
- AC-05: User can create new draft from any published version.
- AC-06: Tournament binding stores exact `systemId + versionId` references.
- AC-07: Binding supports scope by pair/team where applicable.
- AC-08: Tournament binding can be frozen after start event.
- AC-09: Editor top bar shows system switcher, version badge, and publish state.
- AC-10: Published mode is read-only with explicit `Create draft` CTA.
- AC-11: Data contracts are exposed through typed tRPC procedures.
- AC-12: Quality gates pass (`lint`, `typecheck`, `test`, `build`).

## Constraints

- Backward compatibility with existing single-system local data import.
- Version snapshots must be deterministic and auditable.
- No implicit "latest" version at runtime usage boundaries.

## Risks

- Risk: Draft/published confusion in UX.
  - Mitigation: explicit badges, read-only mode treatment, and confirmation copy.
- Risk: Snapshot bloat.
  - Mitigation: payload diff/compression strategy in storage phase.
- Risk: Tournament freeze edge cases.
  - Mitigation: state machine tests for binding transitions.

## Exit Criteria

- Spec task board complete with evidence.
- API contracts documented and linked.
- Linear parent/child issues completed.
