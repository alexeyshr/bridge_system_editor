# Plan: PR-14 Content Authoring UX and Publication Workflow

Spec: `specs/012-content-authoring-ux-and-publication/spec.md`  
Date: 2026-03-13  
Status: Implemented (F01-F06 complete)

## Phase 1: Information Architecture and Navigation

Scope:
- add content workspace routes,
- add portal navigation entry points,
- establish consistent shell + breadcrumbs for content pages.

Deliverables:
- `/dashboard/content` list page,
- `/dashboard/content/new` authoring page,
- `/dashboard/content/[contentId]/edit` authoring page.

Verification:
- authoring routes are discoverable and role-aware.

## Phase 2: Block Editor MVP

Scope:
- implement block composer for all supported types,
- support add/remove/reorder controls,
- enforce schema-aligned block inputs.

Deliverables:
- editor component for block management and metadata.

Verification:
- valid payload can be composed without direct JSON editing.

## Phase 3: Draft Save Flow

Scope:
- connect editor to create/update APIs,
- show save states and error retry behavior.

Deliverables:
- create draft flow,
- update draft flow,
- save state UX.

Verification:
- author can recover from transient save errors and continue editing.

## Phase 4: Publish/Archive UX

Scope:
- publish + archive actions with confirmation dialogs,
- lifecycle badges and guardrail messages.

Deliverables:
- lifecycle controls integrated in editor/detail screens.

Verification:
- lifecycle state transitions are explicit and auditable in UI.

## Phase 5: Discovery Integration

Scope:
- integrate authored content in dashboard/navigation discovery paths,
- preserve ACL-safe behavior for all actor types.

Deliverables:
- content list/discovery polish,
- dashboard integration updates.

Verification:
- newly authored content is visible where expected for permitted users.

## Phase 6: Quality and Rollout

Scope:
- run full quality gate,
- update docs and rollout notes.

Deliverables:
- updated roadmap/triage/spec artifacts,
- fix note with rollout summary.

Verification:
- `lint`, `typecheck`, `test`, `build` all pass.
