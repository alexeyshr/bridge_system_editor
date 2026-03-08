# Plan: PR-11 Systems Lifecycle and Tournament Usage

Spec: `specs/008-systems-lifecycle-and-tournament-usage/spec.md`  
Date: 2026-03-08  
Status: Draft

## Phase 1: Data Model + Contracts

Scope:
- define `System`, `Draft`, `Version`, `TournamentBinding` entities,
- establish tRPC contract boundaries.

Deliverables:
- Drizzle schema updates,
- contract definitions and validation.

Verification:
- schema tests and contract tests pass.

## Phase 2: Systems Hub

Scope:
- list/search/filter systems,
- ownership and access summary,
- open system into editor context.

Deliverables:
- Systems Hub pages/components,
- query/mutation integration.

Verification:
- hub integration tests pass.

## Phase 3: Draft/Published Lifecycle

Scope:
- publish version,
- compare versions,
- create draft from version,
- version badge/status in editor shell.

Deliverables:
- lifecycle endpoints,
- editor top-bar controls.

Verification:
- lifecycle flow tests pass.

## Phase 4: Tournament Usage Binding

Scope:
- bind version to tournament contexts,
- pair/team scope support,
- freeze behavior.

Deliverables:
- binding API and UI,
- freeze rule checks.

Verification:
- state-machine tests for binding transitions.

## Phase 5: Template Profiles (Bootstrap)

Scope:
- starter profiles (`Standard`, `2/1`, `Precision`) as optional system presets.

Deliverables:
- profile templates and creation flow.

Verification:
- preset generation tests pass.

## Phase 6: Acceptance + Documentation

Scope:
- QA and docs update for lifecycle behavior.

Deliverables:
- acceptance report,
- docs updates (`ROADMAP`, `bounded-contexts`, spec references).

Verification:
- full quality gate green.
