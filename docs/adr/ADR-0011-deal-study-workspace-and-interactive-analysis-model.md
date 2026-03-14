# ADR-0011: Deal Study Workspace and Interactive Analysis Model

- Status: Accepted
- Date: 2026-03-14
- Deciders: BridgeHub portal track
- Tags: architecture, ux, content, bridge, analysis

## Context

Bridge deal analysis in the portal currently relies on generic content blocks.  
This is flexible but not ergonomic enough for high-quality study workflows:

- hand entry is slower than domain expectations,
- auction and lead entry need stronger structure and seat awareness,
- play timeline and DD analysis are not first-class,
- discussion context is detached from exact analysis steps.

Product direction is to provide one focused central analysis canvas with bridge-native controls.

## Decision

1. Introduce a dedicated Deal Studio experience under content domain.
- Keep `content_items` as parent publication object.
- Add study-specific payload and services for deal analysis workflows.

2. Use dual-input model for key domain actions.
- Hands: quick text and card picker.
- Auction: quick text and guided bid pad.
- Preserve both for speed and precision.

3. Use seat-aware and mask-aware canonical model.
- Canonical seat order: `W, N, E, S`.
- Persist explicit visibility masks (hand-level and card-level).
- Enforce mask policy server-side for read responses.

4. Keep analysis in one central canvas.
- No dashboard fragmentation for this feature.
- Narrative, play timeline, DD panel, comments, and polls remain in one vertical flow.

5. Keep DD integration pluggable.
- Support import/snapshot mode first.
- Optional external solver adapter can be added without changing top-level UI contract.

## Consequences

### Positive

- Faster deal authoring and fewer input errors.
- Better study readability and discussion context.
- Supports both expert fast input and guided novice input.
- Preserves existing publication and ACL model.

### Negative

- Additional domain complexity in content services and validation.
- More UI state transitions to test (masks, play steps, DD states).
- Requires careful backward compatibility with existing `deal`/`auction` blocks.

## Alternatives Considered

1. Continue with generic blocks only.
- Rejected: UX does not match bridge analysis workflow complexity.

2. Build standalone app outside content domain.
- Rejected: duplicates ACL/publication/discovery architecture.

3. Enforce only guided input (no quick text mode).
- Rejected: slows expert users and migration from existing notation habits.

## Impacted Specs

- `specs/015-deal-study-workspace-and-interactive-analysis/spec.md`
- `specs/012-content-authoring-ux-and-publication/spec.md`
- `specs/013-space-governance-and-invite-workflow/spec.md`

## Related Documents

- `docs/WORKFLOW.md`
- `docs/TRIAGE.md`
- `docs/ROADMAP.md`
- `docs/bounded-contexts.md`
