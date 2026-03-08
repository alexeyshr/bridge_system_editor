# ADR-0009: Editor Lifecycle, Versioning, and Collaboration Boundary

- Status: Proposed
- Date: 2026-03-08
- Deciders: BridgeHub core
- Tags: architecture, editor, versioning, collaboration, tournaments

## Context

Current UI (`Left / Center / Right`) is strong as an editor surface, but it must become a module inside a larger portal.
New requirements introduce a layer above editor CRUD:

- manage many systems,
- version systems and rollback safely,
- bind a concrete system version to tournament contexts,
- support broad discussions without mutating system content,
- support role-based permissions and multi-channel invites.

Without explicit domain boundaries, editor data and social discussion data will mix and cause permission, audit, and regression risks.

## Decision

1. Keep current UI as `EditorSurface` module.
- Left/Center/Right remains the core editing workspace.
- New portal features wrap around it instead of replacing it.

2. Introduce system lifecycle model.
- Editor writes only to mutable `Draft`.
- Publish creates immutable `SystemVersion` snapshot.
- Rollback is implemented as `Create draft from version`.

3. Tournament usage binds to immutable version.
- Tournament contracts store `systemId + versionId`.
- No "latest version" indirection in tournament runtime.
- Binding can be frozen after tournament start.

4. Split comments into two domains.
- `System notes`: part of node meaning, editor-only mutation.
- `Discussion threads`: collaboration messages, suggestions, mentions; no direct mutation of bidding tree.

5. Role model baseline.
- `owner`, `editor`, `reviewer`, `viewer`.
- Permissions enforced by API contracts.

6. Sharing channels baseline.
- invite by email,
- invite by internal user lookup,
- Telegram handoff link.

## Consequences

### Positive

- Stable contract between editor and portal modules.
- Safer tournament behavior due to immutable version bindings.
- Cleaner permission model by separating content and discussion domains.
- Existing editor UI preserved while platform capabilities grow.

### Negative

- Additional domain entities and APIs.
- Need migration path from current single-layer model to lifecycle model.
- More explicit UX states (draft, published, read-only, discussion).

## Alternatives Considered

1. Keep single mutable system model everywhere.
- Rejected: breaks reproducibility for tournaments and rollback safety.

2. Treat discussions as node notes in same model.
- Rejected: permission boundary is unclear; noisy history; high moderation risk.

3. Replace editor UI while introducing lifecycle.
- Rejected: high regression risk and unnecessary rework.

## Impacted Specs

- `specs/007-editor-surface-v2/spec.md`
- `specs/008-systems-lifecycle-and-tournament-usage/spec.md`
- `specs/009-collaboration-discussions-and-sharing/spec.md`

## Related Documents

- `docs/ROADMAP.md`
- `docs/TRIAGE.md`
- `docs/bounded-contexts.md`
- `docs/c4/c2-container.mmd`
