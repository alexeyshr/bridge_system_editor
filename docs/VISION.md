# BridgeHub Vision

Last updated: 2026-03-08

## North Star

Build a reliable bridge portal where players and partnerships can create, test, and share bidding systems, then use the same data in training, tournament prep, and post-game analysis.

## Who It Is For

- Individual bridge players who want structured bidding notes.
- Partnerships that need shared, versioned agreements.
- Coaches, schools, and clubs that maintain multiple systems.
- Community members who learn by exploring real bidding trees.

## Problems We Solve

- Bidding agreements are scattered across chats, notes, and files.
- Updating a system is slow and error-prone.
- Sharing with partner(s) is fragile and lacks permissions.
- There is no single source of truth across editor, portal, and Telegram workflows.

## Why BridgeHub Is Different

- Domain-first UX: bidding tree editor is the core, not an add-on.
- Collaboration-first model: ownership, sharing, and roles from day one.
- Multi-channel access: web portal plus Telegram integration.
- API-first architecture so the editor module can be embedded into the full portal without UI rewrite.
- Lifecycle-safe model: drafts are mutable, published versions are immutable and reproducible.

## Success Horizon

### 1 year

- Stable bidding module in production.
- Auth + personal systems + sharing by email/internal user lookup.
- P95 editor interaction latency under 200 ms for normal trees.

### 3 years

- Full portal with tournament prep and study flows around the same system data.
- Telegram Mini App + bot workflows used in daily partnership routines.
- Searchable repository of public or shared bidding systems.

### 5 years

- De-facto regional platform for bridge study and partnership coordination.
- Mature ecosystem of training, analytics, and community content around a unified domain model.

## Product Boundaries (Current Stage)

In scope now:
- Bidding System Editor as a complete module.
- Systems Hub + versioning + tournament usage binding around the editor module.
- Migration to target stack: Next.js + TypeScript + tRPC + Drizzle + PostgreSQL.
- Reusable API contracts for future portal modules.

Out of scope now:
- Full tournament engine and scoring.
- Real-time table play simulation.
- Monetization and billing workflows.

## Development Principles

- API-first and contract-first for all cross-module capabilities.
- Spec-Driven Development (SDD): spec -> plan -> tasks -> PR evidence.
- Architecture decisions documented in ADRs before irreversible choices.
- Preserve UI behavior while migrating backend internals.

## Related Documents

- [`docs/JTBD.md`](./JTBD.md)
- [`docs/GLOSSARY.md`](./GLOSSARY.md)
- [`docs/ROADMAP.md`](./ROADMAP.md)
- [`docs/WORKFLOW.md`](./WORKFLOW.md)
- [`docs/IDEA_CONTEXT.md`](./IDEA_CONTEXT.md)
- [`docs/IDEAS_SECTION_INDEX.md`](./IDEAS_SECTION_INDEX.md)
- [`docs/bounded-contexts.md`](./bounded-contexts.md)
- [`docs/c4/`](./c4/)
- [`docs/adr/`](./adr/)
