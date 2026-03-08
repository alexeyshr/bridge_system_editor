# Spec: PR-9 Platform Core Hardening (Portal-Ready)

Feature ID: `pr9-platform-core-hardening`  
Date: 2026-03-07  
Status: Draft for implementation

## Architecture References

- ADR: `docs/adr/ADR-0003-drizzle-only-cutover-and-prisma-removal.md`
- ADR: `docs/adr/ADR-0004-zustand-slice-architecture.md`
- ADR: `docs/adr/ADR-0005-auth-stack-migration-direction.md`
- ADR: `docs/adr/ADR-0006-postgres-search-and-indexing-first.md`
- ADR: `docs/adr/ADR-0007-sse-for-collaboration-notifications.md`
- ADR: `docs/adr/ADR-0008-observability-and-protection-baseline.md`

## Context

Module-level editor work is complete (`specs/004`).
Next phase is platform hardening for a multi-user portal path with realistic target scale (15-20K users).

Current key risks:
- dual ORM path (Prisma + Drizzle),
- oversized state module (`useBiddingStore`),
- legacy auth foundation,
- missing production-grade observability and endpoint protection.

## Problem Statement

Without simplification and hardening, each new feature will increase cost of change and regression risk.
The goal is to reduce architecture drag before expanding collaboration features.

## Goals

- Remove dual-driver architecture and complete Drizzle-only cutover.
- Refactor editor state to slices while preserving current UI behavior.
- Migrate auth stack from legacy v4 path using explicit decision gate.
- Implement PostgreSQL-native search/indexing baseline.
- Add SSE-based collaboration notifications.
- Add observability and endpoint protection baseline.

## Non-Goals

- No microservices split.
- No Redis, Meilisearch/Elasticsearch, queue brokers, Kubernetes in this phase.
- No Google-Docs style co-editing.

## Functional Acceptance Criteria

- AC-01: Prisma runtime path is removed; Drizzle is single persistence path.
- AC-02: Store is slice-structured; existing UI behavior remains regression-safe.
- AC-03: Auth migration path is implemented (or finalized and shipped) with Telegram compatibility.
- AC-04: Sensitive routes have rate limiting and abuse-safe behavior.
- AC-05: Search uses PostgreSQL FTS + indexes with measurable query improvements.
- AC-06: SSE stream delivers system change notifications to active clients.
- AC-07: Structured logs and error tracking are active in dev/stage and documented.
- AC-08: `lint`, `typecheck`, `test`, `build`, and updated UI baseline all pass.

## Constraints

- Preserve editor UX and data compatibility during migration.
- Keep rollout reversible at release level.
- Keep infrastructure footprint minimal for self-hosted VPS.

## Risks

- Risk: Auth migration complexity and token/session regressions.
  - Mitigation: dedicated compatibility spike and staged rollout.
- Risk: Store refactor introduces subtle UI regressions.
  - Mitigation: baseline-driven regression checks and slice-by-slice migration.
- Risk: Query/index tuning uncertainty.
  - Mitigation: benchmark before/after and keep fallback query path.

## Exit Criteria

- `specs/005` task board completed.
- Parent and child Linear issues for PR-9 are completed with evidence.
- `specs/001` open implementation scope is either completed or explicitly superseded where applicable.
