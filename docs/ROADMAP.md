# Product Roadmap (Now / Next / Later)

Last updated: 2026-03-07

Cadence:
- 6-week build cycles + cooldown window (Shape Up style).
- Re-prioritize at cycle boundaries, not daily.

Source alignment:
- `docs/source/PRIORITIES.md` (phase layering)
- `docs/source/IDEAS.md` (idea bank)
- process: `docs/WORKFLOW.md`
- Traceability policy: `docs/IDEA_CONTEXT.md`

## Now

1. Execute PR-9 platform core hardening (`specs/005-platform-core-hardening/`):
   - Drizzle-only cutover (remove Prisma path),
   - Zustand slice refactor + Error Boundaries,
   - auth migration gate + rate limiting.
2. Implement portal-ready collaboration baseline:
   - PostgreSQL FTS + indexing (no external search engine),
   - SSE notifications for system updates,
   - schemaVersion migration strategy.
3. Add production operability baseline:
   - structured logs (`pino`),
   - error tracking (Sentry),
   - final QA evidence gate.

## Next

1. Auth and access model hardening:
   - email/password,
   - Telegram login/linking,
   - roles and permissions for sharing.
2. Collaboration features:
   - invite by email,
   - invite internal users,
   - Telegram share handoff.
3. Persistence behavior:
   - auto-save as default canonical path,
   - import/export as interoperability tool, not primary save model.

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

## Planning Rules

- Every `Now` item must have an SDD spec in `specs/`.
- Architecture-impacting work must reference an ADR in `docs/adr/`.
- Any large feature requires explicit out-of-scope boundaries.
- New ideas from `IDEAS.md` are reviewed at cycle boundary and mapped to `Now/Next/Later` or kept in backlog.
