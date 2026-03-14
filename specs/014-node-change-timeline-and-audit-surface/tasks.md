# Tasks: PR-16 Node Change Timeline and Audit Surface

Spec: `specs/014-node-change-timeline-and-audit-surface/spec.md`
Plan: `specs/014-node-change-timeline-and-audit-surface/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F06`

## F01 Timeline contract and event model

- [x] T1601 add timeline event DTO and category mapper
- [x] T1602 add system timeline service with ACL checks
- [x] T1603 add bidding lifecycle timeline router endpoint
- [x] T1604 add audit events for nodes/lifecycle/bindings in service layer

## F02 Lifecycle menu timeline UI

- [x] T1610 add timeline query to lifecycle menu
- [x] T1611 render timeline list item component (actor/action/time/payload)
- [x] T1612 add category filter and resilient loading/empty/error states
- [x] T1613 align dense portal styling and compact scrolling area

## F03 Node-level diff visibility polish

- [x] T1620 improve sequence diff summaries and affordances

## F04 Actor attribution and profile links

- [x] T1630 actor fallback strategy and optional profile link rendering

## F05 Retention and timeline window controls

- [x] T1640 configurable limit/window and cursor-ready API shape

## F06 Quality gate and rollout docs

- [x] T1650 run lint/typecheck/test
- [x] T1651 update roadmap/triage and linear mapping
- [x] T1652 add rollout note in `fix/*`
