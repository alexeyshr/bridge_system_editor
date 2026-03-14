# Spec: PR-13 Space-Scoped Content and System Integration

Feature ID: `pr13-space-scoped-content-and-system-integration`  
Date: 2026-03-12  
Status: Draft for implementation

## Architecture References

- ADR: `docs/adr/ADR-0001-api-first-modular-monolith.md`
- ADR: `docs/adr/ADR-0002-drizzle-trpc-default-stack.md`
- ADR: `docs/adr/ADR-0009-editor-lifecycle-and-collaboration-boundary.md`
- ADR: `docs/adr/ADR-0010-space-scoped-content-and-system-governance.md`

## Context

The portal already has editor lifecycle, collaboration flows, and dashboard modules.  
Next, we need a single governance model so systems and content behave consistently across:

- personal workspaces,
- team/community spaces,
- public and private visibility boundaries.

## Problem Statement

Without a `Space` boundary:

- ownership and transfer of systems are ambiguous,
- content visibility rules are inconsistent,
- private community workflows are hard to enforce,
- portal modules cannot apply one ACL model across editor/content/tournaments.

## Goals

- Introduce `Space` as default container for systems and content.
- Create systems in personal space by default.
- Allow controlled transfer to team spaces.
- Enforce owner-only publish authority for systems.
- Support content in mixed formats using block-based model.
- Enforce strict visibility policy:
  - hidden spaces cannot publish public content.
- Keep tournament binding optional and decoupled from publishing.
- Keep UX simple now (`draft`, `published`, `archived`) with extension path to review workflow later.

## Non-Goals

- No mandatory editorial moderation workflow in this phase.
- No marketplace/discovery ranking algorithm in this phase.
- No real-time co-editing protocol changes in this phase.
- No tournament scoring or arbitration engine in this phase.

## Domain Model (Target)

### Spaces

- `type`: `personal | team`
- `visibility`: `public | hidden`
- `joinPolicy`: `request | invite_only`
- `reviewPolicy`: `none | required` (default `none`)

### Membership

- Space roles: `owner | admin | editor | member`
- Join requests for public spaces (when `joinPolicy=request`)
- Invite-only flow for hidden spaces

### Content

- `format`: `article | deal_analysis | auction_lesson | tournament_recap | quiz`
- `visibility`: `public | members_only`
- `status`: `draft | published | archived`
- `blocks`: typed content blocks (`text`, `callout`, `deal`, `auction`, `question`, `answer`, ...)

### Systems

- New system default `spaceId = creatorPersonalSpaceId`
- `creatorUserId` immutable
- Publish allowed only for creator/owner
- Move flow supported: personal space -> team space

## Functional Acceptance Criteria

- AC-01: Authenticated user can create a personal space and team space.
- AC-02: New systems are created in personal space by default.
- AC-03: Owner can move a system from personal space to team space.
- AC-04: Only system creator/owner can publish system versions.
- AC-05: Editors can modify draft system data but cannot publish.
- AC-06: Space visibility and join policy are enforced server-side.
- AC-07: Hidden space is not listed in public directory.
- AC-08: Public space can accept join requests when configured.
- AC-09: Hidden space membership is possible only by invite.
- AC-10: Content items support block-based payload and version snapshots.
- AC-11: Content lifecycle supports `draft`, `published`, `archived`.
- AC-12: Hidden-space content cannot be published as `public`.
- AC-13: Public-space content can be `public` or `members_only`.
- AC-14: Reader access checks combine space membership and content visibility.
- AC-15: Global search respects visibility constraints.
- AC-16: Tournament binding for systems remains optional at publish time.
- AC-17: Quality gates pass (`lint`, `typecheck`, `test`, `build`).
- AC-18: Documentation and rollout notes are updated.

## Access Control Invariants

- INV-01: `space.visibility=hidden` forbids listing outside membership/invite flows.
- INV-02: `space.visibility=hidden` + `content.visibility=public` is invalid.
- INV-03: `system.publish` requires `actor.userId === system.creatorUserId`.
- INV-04: `system.move` requires owner privileges in source space and create rights in target space.
- INV-05: ACL checks are enforced server-side, not by client state.

## Risks

- Risk: Publish bottleneck when owner is unavailable.
  - Mitigation: keep explicit policy and document future admin override gate (off by default).
- Risk: ACL regressions across mixed modules.
  - Mitigation: shared `canRead/canEdit/canPublish` helpers + integration tests.
- Risk: Visibility leaks in search and feeds.
  - Mitigation: apply visibility filters at query layer, not UI-only filtering.

## Exit Criteria

- Spec task board complete with evidence.
- ACL and visibility invariants verified by tests.
- ADR and docs linked in implementation PRs.
- Linear parent/child issues created and mapped.
