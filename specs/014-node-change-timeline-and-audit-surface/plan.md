# Plan: PR-16 Node Change Timeline and Audit Surface

Spec: `specs/014-node-change-timeline-and-audit-surface/spec.md`
Date: 2026-03-13
Status: F01-F06 Delivered

## F01: Timeline contract and event model

Scope:
- define timeline DTO and category mapping,
- add server-side timeline listing with ACL,
- expose router endpoint.

Deliverables:
- `lib/server/system-timeline-service.ts`
- `lib/validation/systems.ts` additions
- `lib/trpc/routers/bidding.ts` additions

## F02: Lifecycle menu timeline UI

Scope:
- add recent events panel in lifecycle overlay,
- render action/actor/time and compact payload,
- add category filter + resilient states.

Deliverables:
- `components/SystemLifecycleMenu.tsx` timeline section

## F03: Node-level diff visibility polish

Scope:
- richer node sequence summaries and jump affordances.

Deliverables:
- `components/SystemLifecycleMenu.tsx` diff chips and jump controls in compare + timeline
- `lib/server/systems-service.ts` richer node sync payload previews

## F04: Actor attribution and profile links

Scope:
- deterministic actor fallback + profile references.

Deliverables:
- `lib/server/system-timeline-service.ts` actor label/profile fallback strategy
- `components/SystemLifecycleMenu.tsx` optional actor profile links

## F05: Retention and timeline window controls

Scope:
- tuning limits/cursors/pagination window.

Deliverables:
- `lib/validation/systems.ts` cursor/window schema
- `lib/server/system-timeline-service.ts` window filter + cursor paging contract
- `lib/trpc/routers/bidding.ts` timeline input shape aligned to cursor paging
- `components/SystemLifecycleMenu.tsx` window selector + load-more controls

## F06: Quality gate and rollout docs

Scope:
- full checks + docs updates + rollout note.

Deliverables:
- quality checks: `lint`, `typecheck`, targeted `test`, `build`
- docs: `docs/ROADMAP.md`, `docs/TRIAGE.md`, `specs/014.../*`
- rollout note: `fix/2026-03-13-pr16-f03-f06-node-timeline-polish.md`
