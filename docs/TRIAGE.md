# TRIAGE Decisions

Last updated: 2026-03-14
Cycle: Editor module -> Portal integration track

## Inputs

- `docs/source/IDEAS.md`
- `docs/source/PRIORITIES.md`
- Product context update from 2026-03-08 (editor productivity + systems lifecycle + collaboration requirements)
- Product context update from 2026-03-12 (space-scoped content, strict visibility, owner-publish policy)
- Product context update from 2026-03-13 (content authoring UX and publication flow)
- Product context update from 2026-03-13 (spaces governance workspace and invite acceptance UX)
- Product context update from 2026-03-13 (node change timeline and audit surface in lifecycle menu)
- Product context update from 2026-03-14 (single-surface deal study and interactive bridge analysis workflow)

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

4. Space-scoped portal content and system governance
- Introduce `Space` as default container for content and systems.
- New systems are created in personal space by default.
- Support transfer flow from personal space to team space.
- Keep publication authority strict: only system creator/owner can publish.
- Support content visibility levels (`public`, `members_only`) with strict rule:
  - if space is `hidden`, `public` content is forbidden.
- Keep tournament binding optional and organizer-focused (not required for publish).

5. Content authoring UX and publication workflow
- Add portal content workspace routes (`list/create/edit/view`).
- Implement block-based composer for supported content block types.
- Add draft save, publish, and archive UX with server-aligned guardrails.
- Preserve ACL-safe discovery for guest/member/non-member paths.

6. Spaces governance workspace and invite flow
- Unify spaces directory and own-space controls in one workspace.
- Add team space creation and policy editing controls.
- Add join request moderation workflow in UI.
- Add invite management operations (create/copy/revoke).
- Add token acceptance route with auth-safe entry (`/space-invite/[token]`).

7. Node change timeline and audit surface
- Add system-scoped timeline API from `audit_events`.
- Expand audit coverage for node sync, lifecycle transitions, and binding operations.
- Surface compact recent activity feed inside lifecycle menu with category/window filters, cursor paging, actor attribution, and sequence jump affordances.
- Delivery status: F01-F06 completed.

8. Deal study workspace and interactive analysis
- Introduce a focused central Deal Studio experience for bridge hand analysis.
- Provide W/N/E/S hand editor with quick text mode and card picker mode.
- Provide dual auction input (quick string + guided bid pad) with seat order.
- Add lead picker, play-by-trick timeline, and DD analysis panel.
- Add mask controls (hide hands/cards), threaded comments, and scoped polls.
- Keep strict ACL and publication policy aligned with spaces/content rules.
- Delivery status: completed (`F01..F08`, Linear `BRI-99..BRI-107`).

## Placement

### Now

- Spec package `specs/007-editor-surface-v2/` (editor productivity/safety baseline)
- ADR `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`
- Spec package `specs/008-systems-lifecycle-and-tournament-usage/` (systems/versioning/usage layer)
- Spec package `specs/009-collaboration-discussions-and-sharing/` (roles, invites, discussions)
- Spec package `specs/011-space-scoped-content-and-system-integration/` (spaces, content visibility, owner-publish policy)
- ADR `docs/adr/ADR-0010-space-scoped-content-and-system-governance.md`
- Spec package `specs/012-content-authoring-ux-and-publication/` (authoring UX, lifecycle controls, discovery integration)
- Spec package `specs/013-space-governance-and-invite-workflow/` (spaces governance and invite acceptance flow)
- Spec package `specs/014-node-change-timeline-and-audit-surface/` (timeline contract and lifecycle activity feed)
- ADR `docs/adr/ADR-0011-deal-study-workspace-and-interactive-analysis-model.md`
- Spec package `specs/015-deal-study-workspace-and-interactive-analysis/` (deal studio, play timeline, DD, comments, polls)

### Next

- System profile templates (`Standard`, `2/1`, `Precision`) and guided onboarding flows
- Node-level right-panel history drill-down backed by server audit log
- Automation for tournament-to-system assignment checks

### Later

- Public template marketplace and community discovery
- Cross-system analytics and recommendation/ranking overlays

## Rejected (this cycle)

- None

## Traceability

- Roadmap alignment: `docs/ROADMAP.md`
- Architecture decisions:
  - `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`
  - `docs/adr/ADR-0010-space-scoped-content-and-system-governance.md`
  - `docs/adr/ADR-0011-deal-study-workspace-and-interactive-analysis-model.md`
- Implementation specs:
  - `specs/007-editor-surface-v2/`
  - `specs/008-systems-lifecycle-and-tournament-usage/`
  - `specs/009-collaboration-discussions-and-sharing/`
  - `specs/011-space-scoped-content-and-system-integration/`
  - `specs/012-content-authoring-ux-and-publication/`
  - `specs/013-space-governance-and-invite-workflow/`
  - `specs/014-node-change-timeline-and-audit-surface/`
  - `specs/015-deal-study-workspace-and-interactive-analysis/`
