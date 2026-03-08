# TRIAGE Decisions

Last updated: 2026-03-08
Cycle: Editor module -> Portal integration track

## Inputs

- `docs/source/IDEAS.md`
- `docs/source/PRIORITIES.md`
- Product context update from 2026-03-08 (editor productivity + systems lifecycle + collaboration requirements)

## Decision Summary

Accepted and mapped to roadmap/spec pipeline:

1. Editor productivity and safety uplift
- Undo/redo
- Safe delete UX split (`Delete node` vs `Remove from roots/section`)
- Multi-select + batch actions
- Sections drag&drop (reorder + reparent)
- Persisted UI state
- Legal/illegal/duplicate bidding validation
- Explicit actor indicators
- QA smart views
- Command palette + quick add + compact legend

2. Systems lifecycle over Editor
- Systems Hub above EditorSurface
- Draft vs Published immutable versions
- Compare/rollback and `Create draft from version`
- Tournament binding by `systemId + versionId`
- Freeze binding after tournament start

3. Collaboration and sharing separation
- Role model: owner/editor/reviewer/viewer
- Invite by email / internal username / Telegram handoff
- Separation: `system notes` vs `discussion threads`
- Mentions and read-only published links

## Placement

### Now

- Spec package `specs/007-editor-surface-v2/` (editor productivity/safety baseline)
- ADR `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`
- Spec package `specs/008-systems-lifecycle-and-tournament-usage/` (systems/versioning/usage layer)
- Spec package `specs/009-collaboration-discussions-and-sharing/` (roles, invites, discussions)

### Next

- System profile templates (`Standard`, `2/1`, `Precision`) and guided onboarding flows
- Node-level change history timeline backed by server audit log
- Automation for tournament-to-system assignment checks

### Later

- Public template marketplace and community discovery
- Cross-system analytics and recommendation/ranking overlays

## Rejected (this cycle)

- None

## Traceability

- Roadmap alignment: `docs/ROADMAP.md`
- Architecture decisions: `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`
- Implementation specs:
  - `specs/007-editor-surface-v2/`
  - `specs/008-systems-lifecycle-and-tournament-usage/`
  - `specs/009-collaboration-discussions-and-sharing/`
