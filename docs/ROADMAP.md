# Product Roadmap (Now / Next / Later)

Last updated: 2026-03-14

Cadence:
- 6-week build cycles + cooldown window (Shape Up style).
- Re-prioritize at cycle boundaries, not daily.

Source alignment:
- `docs/source/PRIORITIES.md` (phase layering)
- `docs/source/IDEAS.md` (idea bank)
- process: `docs/WORKFLOW.md`
- Traceability policy: `docs/IDEA_CONTEXT.md`

## Now

1. Finish PR-9 platform core hardening (`specs/005-platform-core-hardening/`):
   - Drizzle-only cutover (remove Prisma path),
   - Zustand slice architecture + Error Boundaries,
   - auth migration gate + rate limiting,
   - observability baseline.
2. Deliver Editor Surface v2 (`specs/007-editor-surface-v2/`):
   - undo/redo,
   - safe delete UX split,
   - multi-select batch actions,
   - section drag/drop reordering,
   - persisted UI state.
3. Introduce systems lifecycle above editor (`specs/008-systems-lifecycle-and-tournament-usage/`):
   - Systems Hub,
   - draft/published versioning,
   - version compare + rollback,
   - tournament binding by `systemId + versionId`.
4. Start collaboration and sharing layer (`specs/009-collaboration-discussions-and-sharing/`):
   - role-based permissions,
   - invite channels (email/username/Telegram),
   - discussion threads + mentions,
   - publish read-only link.
5. Start space-scoped portal content and systems integration (`specs/011-space-scoped-content-and-system-integration/`):
   - personal and team spaces,
   - strict content visibility policy (`hidden` spaces cannot publish public content),
   - owner-only system publishing,
   - optional tournament binding for organizer/judge workflows.
   - status: F01-F06 delivered, stabilization and UX polish continue.
6. Deliver content authoring UX and publication workflow (`specs/012-content-authoring-ux-and-publication/`):
   - content workspace routes (`list/create/edit/view`),
   - block-based draft authoring UI,
   - draft save/publish/archive controls with guardrails,
   - discovery integration in dashboard and navigation.
   - status: F01-F06 delivered.
7. Deliver spaces governance workspace and invite flow (`specs/013-space-governance-and-invite-workflow/`):
   - unified spaces workspace (directory + own spaces),
   - team space create/edit policy controls,
   - join request moderation and invite operations,
   - invite token acceptance route (`/space-invite/[token]`).
   - status: F01-F06 delivered.
8. Deliver node change timeline and audit surface (`specs/014-node-change-timeline-and-audit-surface/`):
   - system timeline contract and audit category model,
   - audit coverage for node/lifecycle/binding operations,
   - lifecycle menu timeline surface with category/window filters, cursor paging, and sequence jump affordances.
   - status: F01-F06 delivered.
9. Deliver deal study workspace and interactive analysis (`specs/015-deal-study-workspace-and-interactive-analysis/`):
   - single-surface central deal canvas (non-dashboard style),
   - W/N/E/S hands composer with mask controls,
   - dual auction entry (quick text + guided bid pad) and lead picker,
   - step-by-step play timeline and DD analysis panel,
   - anchored comments and decision polls.
   - status: delivered (F01-F08, Linear `BRI-99..BRI-107`).

## Next

1. Domain depth improvements:
   - legal/illegal/duplicate bid validation visibility,
   - QA smart views (`Dead ends`, `No meaning`, `No HCP`, `No forcing`, `Conflicts`),
   - actor-aware visual legend polish.
2. System profile templates and onboarding:
   - `Standard`, `2/1`, `Precision`,
   - starter roots/sections and guided setup.
3. Node change timeline deepening:
   - node-level history in right panel,
   - richer attribution and drill-down (`who/when/what`).
4. Deal study enhancements after MVP:
   - solver adapter hardening and performance budget,
   - reusable study templates for lessons and tournament review.

## Later

1. Bridge portal modules around editor data:
   - training workflows,
   - tournament prep tools,
   - searchable knowledge base.
2. Advanced analytics/search:
   - branch quality and agreement coverage metrics.
   - reconsider external search only if PostgreSQL thresholds are exceeded.
3. Community capabilities:
   - public templates,
   - discoverable systems,
   - club/school spaces.
4. Advanced collaboration:
   - proposal workflow from discussions to draft changes,
   - moderation policies and abuse controls.

## Planning Rules

- Every `Now` item must have an SDD spec in `specs/`.
- Architecture-impacting work must reference an ADR in `docs/adr/`.
- Any large feature requires explicit out-of-scope boundaries.
- New ideas from `IDEAS.md` are reviewed at cycle boundary and mapped to `Now/Next/Later` or kept in backlog.
