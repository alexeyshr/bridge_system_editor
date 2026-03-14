# Plan: PR-17 Deal Study Workspace and Interactive Analysis

Spec: `specs/015-deal-study-workspace-and-interactive-analysis/spec.md`  
Date: 2026-03-14  
Status: Proposed

## F01: Single-surface Deal Studio shell

Scope:
- add dedicated route and single-column central canvas layout,
- sticky top action rail,
- capability-aware view/edit modes.

Deliverables:
- `app/dashboard/content/[contentId]/study` (or equivalent canonical route),
- shared studio shell component with compact typography and spacing tokens.

Verification:
- no dashboard-card visual fragmentation,
- editor and reader modes are explicit.

## F02: Hands composer (W/N/E/S) + validation

Scope:
- dual hand entry mode (quick text + card picker),
- full deck validation and conflict warnings,
- dealer/vulnerability controls.

Deliverables:
- `HandsCompassEditor`,
- hand parser + duplicate-card validator,
- import from link parser where available.

Verification:
- impossible deck states are blocked with actionable errors.

## F03: Auction builder + lead picker

Scope:
- fast text auction input and guided bid pad,
- seat-aware turn order,
- lead selector and contract summary.

Deliverables:
- `AuctionBuilder`,
- `LeadPicker`,
- normalized auction storage model.

Verification:
- user can complete common auction flows without manual syntax memorization.

## F04: Visibility masks and reveal policy

Scope:
- hide hand and hide-card controls,
- per-study reveal policy,
- role-aware rendering in published mode.

Deliverables:
- mask editor UI,
- server-side mask evaluator.

Verification:
- masked cards never leak in API payload for non-authorized viewers.

## F05: Play timeline (step-by-step)

Scope:
- trick-by-trick entry and navigation,
- leader/winner progression,
- compact timeline UI.

Deliverables:
- `PlayTimelinePanel`,
- play step persistence and ordering.

Verification:
- author can replay and edit any trick step.

## F06: DD analysis panel

Scope:
- DD snapshot storage and render,
- import-first mode + optional solver integration hook,
- par summary presentation.

Deliverables:
- `DoubleDummyPanel`,
- DD snapshot contract.

Verification:
- DD data can be attached and rendered consistently for readers.

## F07: Narrative, comments, polls

Scope:
- narrative editor with formatting and anchored references,
- threaded comments below study,
- poll creation and voting for analysis decisions.

Deliverables:
- `NarrativeComposer`,
- `DiscussionThread`,
- `StudyPolls`.

Verification:
- readers can discuss exact auction/play moments with anchored context.

## F08: Quality gate and rollout

Scope:
- tests, docs, rollout notes, linear state sync.

Deliverables:
- quality checks (`lint`, `typecheck`, `test`, `build`),
- updated roadmap/triage/bounded-context docs,
- rollout note in `fix/*`.

Verification:
- acceptance criteria from spec are met with evidence.
