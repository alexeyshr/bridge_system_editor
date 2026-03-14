# Spec: PR-14 Content Authoring UX and Publication Workflow

Feature ID: `pr14-content-authoring-ux-and-publication`  
Date: 2026-03-13  
Status: Implemented

## Architecture References

- ADR: `docs/adr/ADR-0010-space-scoped-content-and-system-governance.md`
- Spec dependency: `specs/011-space-scoped-content-and-system-integration/spec.md`

## Context

PR-13 introduced content domain APIs, lifecycle rules, and ACL behavior.  
PR-14 focuses on user-facing authoring UX so content can be created and published inside portal spaces without direct API usage.

## Problem Statement

Current content support is backend-first. Portal users can read content, but authoring flow is incomplete:

- no first-class workspace for content drafts,
- no block editor UX,
- no clear lifecycle actions in interface,
- no stable save/publish feedback for authors.

## Goals

- Deliver content workspace with list/create/edit/view navigation.
- Implement block composer UI for all supported block types.
- Support draft create/update with clear save status.
- Support publish/archive actions with guardrails.
- Keep ACL behavior strict and visible in UX.
- Integrate authored content into discovery surfaces.

## Non-Goals

- No collaborative real-time editing.
- No WYSIWYG rich text framework integration in this phase.
- No review/approval workflow beyond `draft/published/archived`.
- No new content block types beyond existing schema.

## Functional Acceptance Criteria

- AC-01: Authenticated user with space write capability can create draft content.
- AC-02: User can edit metadata (`title`, `summary`, `format`, `visibility`, `tags`, `links`) and block payload.
- AC-03: Editor supports add/remove/reorder for supported block types.
- AC-04: Draft save status is visible (`dirty/saving/saved/error`).
- AC-05: Publish action is available with confirmation and success/error feedback.
- AC-06: Archive action is available with confirmation and success/error feedback.
- AC-07: Hidden-space + public-content violation is shown as explicit guardrail message.
- AC-08: Content list supports filtering by query/status/format/space.
- AC-09: Guest users can browse visible content but cannot enter authoring flow.
- AC-10: Dashboard/discovery shows authored content links with ACL-safe visibility.
- AC-11: Quality gates pass (`lint`, `typecheck`, `test`, `build`).
- AC-12: Docs and rollout notes updated.

## Risks

- Risk: UX complexity from many block types in one screen.
  - Mitigation: keep dense but explicit block controls and per-block forms.
- Risk: ACL confusion for members with read-only roles.
  - Mitigation: show capability-aware empty states and disabled controls with reason.
- Risk: hidden-space visibility rule may look like save bug.
  - Mitigation: show dedicated guardrail explanation before publish.

## Exit Criteria

- PR-14 phase tasks complete in `specs/012.../tasks.md`.
- Linear issues `BRI-79..BRI-84` completed.
- Quality gates green with evidence.
