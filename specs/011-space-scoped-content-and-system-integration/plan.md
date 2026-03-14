# Plan: PR-13 Space-Scoped Content and System Integration

Spec: `specs/011-space-scoped-content-and-system-integration/spec.md`  
Date: 2026-03-12  
Status: Implemented (F01-F06 complete)

## Phase 1: Space and Membership Data Model

Scope:
- add `spaces`, `space_members`, `space_join_requests`, `space_invites`,
- define visibility and join policy enums,
- define role model for spaces.

Deliverables:
- Drizzle schema + migration,
- baseline ACL helper types.

Verification:
- schema and constraints tests pass.

## Phase 2: ACL Services and API Contracts

Scope:
- implement shared ACL helpers (`canReadSpace`, `canJoinSpace`, `canReadContent`, `canPublishSystem`),
- expose tRPC/REST endpoints for space lifecycle and membership flows.

Deliverables:
- service layer and route contracts,
- negative-path authorization tests.

Verification:
- API integration tests for membership and ACL pass.

## Phase 3: System Ownership and Transfer Integration

Scope:
- enforce default personal space on create,
- enforce owner-only publish for systems,
- implement move-to-team-space flow.

Deliverables:
- systems service updates,
- UI entry points for move flow.

Verification:
- ownership and publish tests pass.

## Phase 4: Content Domain MVP

Scope:
- add `content_items`, `content_versions`, `content_tags`, `content_links`,
- add block-based content payload schema,
- implement draft/publish/archive lifecycle.

Deliverables:
- content APIs and basic editor/reader integration.

Verification:
- lifecycle and block schema tests pass.

## Phase 5: Strict Visibility and Discovery Integration

Scope:
- enforce strict hidden-space publication rule,
- apply visibility filters in feed/search endpoints,
- support join-request and invite-only UX states.

Deliverables:
- portal list/search integration with ACL filters.

Verification:
- visibility leak tests pass for guest/member/non-member scenarios.

## Phase 6: Tournament Optional Binding and Acceptance

Scope:
- keep tournament binding optional in publish flows,
- align organizer-oriented workflows in Operations/Tournament Desk,
- final QA and documentation updates.

Deliverables:
- acceptance report,
- docs updates (`ROADMAP`, `TRIAGE`, bounded contexts, spec links).

Verification:
- full quality gate green.
