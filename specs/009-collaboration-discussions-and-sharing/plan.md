# Plan: PR-12 Collaboration, Discussions, and Sharing

Spec: `specs/009-collaboration-discussions-and-sharing/spec.md`  
Date: 2026-03-08  
Status: Draft

## Phase 1: Access Control Matrix

Scope:
- define capability matrix per role,
- enforce API-level authorization guards.

Deliverables:
- access policy module,
- integration coverage for role checks.

Verification:
- role matrix tests pass.

## Phase 2: Invite Flows

Scope:
- invite by email,
- invite by internal user lookup,
- Telegram handoff token flow.

Deliverables:
- invite APIs and UI,
- invite lifecycle states.

Verification:
- invite flow tests and anti-abuse checks pass.

## Phase 3: Discussion Threads + Mentions

Scope:
- system and node discussion threads,
- mentions parsing and notifications,
- clear boundary from system notes.

Deliverables:
- discussion APIs and UI components,
- mention notification hooks.

Verification:
- thread/mention tests pass.

## Phase 4: Read-Only Publish Links

Scope:
- generate/revoke/rotate read-only links,
- access enforcement and audit logging.

Deliverables:
- tokenized link endpoints,
- read-only viewer mode.

Verification:
- link access tests and revocation checks pass.

## Phase 5: Observability + Final Acceptance

Scope:
- log and monitor collaboration events,
- complete QA and documentation.

Deliverables:
- event logs and traceability,
- acceptance package.

Verification:
- full quality gate green.
