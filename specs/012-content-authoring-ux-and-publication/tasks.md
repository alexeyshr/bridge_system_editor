# Tasks: PR-14 Content Authoring UX and Publication Workflow

Spec: `specs/012-content-authoring-ux-and-publication/spec.md`  
Plan: `specs/012-content-authoring-ux-and-publication/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F06`

## F01 Content Information Architecture and Navigation

- [x] T1401 Add routes `/dashboard/content`, `/dashboard/content/new`, `/dashboard/content/[contentId]/edit`.
- [x] T1402 Add role-aware sidebar/header entry points for content workspace.
- [x] T1403 Align content pages with dense portal shell + breadcrumbs.
- [x] T1404 Add list filters for status/format/space.

## F02 Block Editor MVP

- [x] T1410 Implement block composer for `text`, `callout`, `deal`, `auction`, `question`, `answer`.
- [x] T1411 Add block add/remove/reorder interactions.
- [x] T1412 Add inline validation hints for block payload.
- [x] T1413 Implement metadata form (`title`, `summary`, `format`, `visibility`, `tags`, `links`).

## F03 Draft Save Flow and Optimistic UX

- [x] T1420 Implement create draft flow and redirect to edit route.
- [x] T1421 Implement update draft flow for existing content.
- [x] T1422 Add dirty/saving/saved/error save-state indicators.
- [x] T1423 Add retry-safe error UX for save failures.

## F04 Publish and Archive Guardrails

- [x] T1430 Add publish action with confirmation UX.
- [x] T1431 Add archive action with confirmation UX.
- [x] T1432 Show lifecycle status badges in list/detail/editor screens.
- [x] T1433 Show explicit guardrail message for hidden-space/public visibility conflict.

## F05 Discovery Integration

- [x] T1440 Connect content workspace to portal discovery navigation.
- [x] T1441 Improve content detail page for authored block rendering and metadata.
- [x] T1442 Integrate authored drafts/published content links in dashboard surfaces.
- [x] T1443 [P] Verify ACL-safe UI states for guest/member/non-member views.

## F06 Quality Gate and Rollout Notes

- [x] T1450 Run quality gates (`lint`, `typecheck`, `test`, `build`).
- [x] T1451 Update roadmap/triage/spec docs and linear mapping.
- [x] T1452 Add `fix/*` rollout summary note.
- [x] T1453 Close PR-14 linear phase issues after verification.
