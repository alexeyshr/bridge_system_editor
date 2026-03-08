# Product Roadmap (Now / Next / Later)

Last updated: 2026-03-09

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
3. Close systems lifecycle stream above editor (`specs/008-systems-lifecycle-and-tournament-usage/`):
   - Systems Hub,
   - draft/published versioning,
   - version compare + rollback,
   - tournament binding by `systemId + versionId`,
   - template bootstrap profiles (`Standard`, `2/1`, `Precision`),
   - final acceptance and rollout constraints.
4. Start collaboration and sharing layer (`specs/009-collaboration-discussions-and-sharing/`):
   - role-based permissions,
   - invite channels (email/username/Telegram),
   - discussion threads + mentions,
   - publish read-only link.

## Next

1. Domain depth improvements:
   - legal/illegal/duplicate bid validation visibility,
   - QA smart views (`Dead ends`, `No meaning`, `No HCP`, `No forcing`, `Conflicts`),
   - actor-aware visual legend polish.
2. Profile onboarding polish:
   - deeper starter trees per profile,
   - guided profile-first setup UX,
   - import compatibility prompts for legacy YAML.
3. Node change timeline:
   - node-level history in right panel,
   - audit-based attribution (`who/when/what`).

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
