# ADR-0010: Space-Scoped Content and System Governance

- Status: Accepted
- Date: 2026-03-12
- Deciders: BridgeHub portal track
- Tags: architecture, spaces, content, acl, publishing

## Context

Portal modules now include system lifecycle, collaboration, and dashboard experiences.  
We need a unified container model for:

- content publication and access,
- system ownership and transfer flows,
- private communities and discoverable communities.

Product decisions for this stream:

- default system container is personal space,
- systems can be moved to team spaces,
- only the creator/owner can publish a system,
- tournament binding is optional (organizer-focused),
- strict visibility rule: hidden spaces cannot publish public content.

Without explicit governance boundaries, visibility leaks and ownership ambiguity become likely across modules.

## Decision

1. Introduce `Space` as the top-level governance container.
- Every system and content item belongs to exactly one space.
- Default for new systems: creator personal space.

2. Keep two explicit space visibility modes.
- `public`: discoverable and join-request capable.
- `hidden`: non-discoverable, invite-only access.

3. Keep content visibility policy strict.
- `public` or `members_only` at content level.
- If parent space is `hidden`, `public` is invalid and must be rejected server-side.

4. Keep publication authority strict for systems.
- Only `creator/owner` can publish system versions.
- Editors can collaborate on draft updates but cannot publish.

5. Keep tournament binding decoupled from publication.
- Publishing a system does not require tournament binding.
- Binding remains an optional workflow for organizer/judge scenarios.

6. Use simplified lifecycle UX now, extensible workflow later.
- Current statuses: `draft -> published -> archived`.
- Keep architecture extensible via `review_policy` and future review tables, but do not force review in current UX.

## Consequences

### Positive

- Clear access boundaries for private communities and public spaces.
- Deterministic publication authority reduces accidental releases.
- Seamless integration path for editor module inside portal shell.
- Optional tournament coupling keeps author workflows fast.

### Negative

- Additional ACL checks across spaces, content, and systems.
- Ownership strictness can block publication if owner is unavailable.
- More entities and migrations required before feature rollout.

## Alternatives Considered

1. No space container, only per-item visibility.
- Rejected: weak governance boundary, inconsistent membership flows.

2. Allow any editor to publish.
- Rejected: ownership accountability becomes unclear.

3. Mandatory tournament binding before publish.
- Rejected: unnecessary friction for non-tournament workflows.

4. Full review workflow from day one.
- Rejected: high operational overhead for early-stage moderation capacity.

## Impacted Specs

- `specs/011-space-scoped-content-and-system-integration/spec.md`
- `specs/008-systems-lifecycle-and-tournament-usage/spec.md`
- `specs/009-collaboration-discussions-and-sharing/spec.md`

## Related Documents

- `docs/WORKFLOW.md`
- `docs/TRIAGE.md`
- `docs/ROADMAP.md`
- `docs/bounded-contexts.md`
