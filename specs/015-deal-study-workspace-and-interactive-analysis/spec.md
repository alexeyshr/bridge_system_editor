# Spec: PR-17 Deal Study Workspace and Interactive Analysis

Feature ID: `pr17-deal-study-workspace-and-interactive-analysis`  
Date: 2026-03-14  
Status: Proposed

## Architecture References

- ADR: `docs/adr/ADR-0011-deal-study-workspace-and-interactive-analysis-model.md`
- Spec dependency: `specs/012-content-authoring-ux-and-publication/spec.md`
- Spec dependency: `specs/013-space-governance-and-invite-workflow/spec.md`
- Spec dependency: `specs/009-collaboration-discussions-and-sharing/spec.md`

## Context

Current content authoring supports generic blocks (`text`, `deal`, `auction`, `question`, `answer`), but bridge deal analysis still feels fragmented:

- deal setup is not optimized for rapid W/N/E/S hand input and masking scenarios,
- auction entry is still too text-heavy for many users,
- lead/play/DD analysis are not unified in one focused study surface,
- comments and polling are not deeply integrated with analysis steps.

We need one central study canvas, not a dashboard-like screen, with an explicit bridge analysis workflow.

## Problem Statement

Authors and coaches need to build rich deal studies (hands, auction, lead, play, DD, commentary, discussion) in one place.  
Without a dedicated deal studio UX:

- preparation takes too long,
- formatting is inconsistent,
- analysis quality drops,
- discussion context is lost.

## Goals

- Deliver a single-column central "Deal Studio" page (no dashboard card layout).
- Provide ergonomic hand composer for W/N/E/S with suit-aware input.
- Support dual auction entry:
  - fast manual string input,
  - guided bid pad (level + denomination + pass/double/redouble) with turn order.
- Add lead picker and contract/result summary.
- Support visibility controls:
  - hide hands,
  - hide selected cards,
  - role-based reveal options.
- Add trick-by-trick play mode.
- Add DD analysis section (snapshot contract table + par summary).
- Add narrative section for formatted explanation.
- Add threaded comments and poll blocks under analysis.

## Non-Goals

- No real-time co-editing in this phase.
- No tournament scoring engine integration in this phase.
- No external BBO embed as the primary renderer.
- No moderation workflow beyond existing draft/publish/archive + role ACL.
- No mobile-first redesign of entire portal shell.

## User Personas

1. Author/Coach:
- builds educational deal studies,
- needs speed + precision.

2. Player/Student:
- reads analysis,
- participates in comments and polls.

3. Organizer/Judge:
- uses deal references for tournament review,
- needs clean auction/play timeline and DD snapshot.

## User Journey (Primary)

1. User opens `Create deal study`.
2. Fills W/N/E/S hands via text or card picker.
3. Fills auction using bid pad or quick input.
4. Sets lead and contract outcome.
5. Adds trick-by-trick play notes.
6. Runs or imports DD summary.
7. Writes narrative explanation.
8. Publishes to selected space (policy-aware).
9. Readers comment, reply, and vote in focused polls.

## Functional Acceptance Criteria

- AC-01: Deal Studio opens in a single central canvas layout with sticky top actions.
- AC-02: User can input all four hands (W/N/E/S) by suits (`S/H/D/C`).
- AC-03: User can input hands through both quick text and card picker controls.
- AC-04: Validation prevents duplicate cards and impossible deck states.
- AC-05: Auction supports both fast text input and guided bid pad.
- AC-06: Guided bid pad enforces seat order (`W/N/E/S`) and tracks next actor.
- AC-07: User can set opening lead with suit+rank picker.
- AC-08: User can configure visibility masks for entire hands and selected cards.
- AC-09: Published view applies mask policy correctly for viewer role.
- AC-10: User can enter trick timeline step-by-step and navigate steps.
- AC-11: DD panel shows contract matrix and par summary (from solver or imported result).
- AC-12: Narrative section supports formatted content blocks (headings, lists, callouts, anchors).
- AC-13: Comments support threaded replies and formatted text.
- AC-14: Polls can be attached to study context (auction/lead/play decisions).
- AC-15: Space ACL and content visibility rules remain enforced (hidden space cannot publish public content).
- AC-16: Guest users see read-only surface and sign-in prompts for interaction.
- AC-17: Quality gates pass (`lint`, `typecheck`, `test`, `build`).
- AC-18: Specs, ADR, roadmap, triage, and rollout notes are updated.

## UX and IA Requirements

- One-column centered canvas (`max-width` around 980-1100px).
- Visual order:
  1. Header (title/meta/actions),
  2. Hands + auction + lead,
  3. Play and DD tabs,
  4. Narrative explanation,
  5. Comments and polls.
- Minimal border noise, consistent rounded controls, dense typography.
- Keep visual language aligned with existing portal palette and spacing.

Detailed component contract:  
`specs/015-deal-study-workspace-and-interactive-analysis/ui-contract.md`

## Data Model Direction

Use existing content domain as parent object (`content_items` with `format='deal_analysis'`) and introduce a dedicated study payload model:

1. `deal_studies`
- `content_id` (PK/FK),
- `board`, `dealer`, `vulnerability`,
- `contract_level`, `contract_denom`, `declarer`, `doubled_state`,
- `result_delta`, `lead_suit`, `lead_rank`,
- `hands_json` (normalized seat/suit structure),
- `visibility_mask_json`,
- timestamps.

2. `deal_study_play_steps`
- `id`, `content_id`, `trick_no`, `leader`,
- `cards_json` (four cards by seat),
- `winner`, `note`, `created_at`.

3. `deal_study_dd_snapshots`
- `id`, `content_id`, `source` (`solver` | `import`),
- `matrix_json`, `par_json`, `created_at`.

4. `deal_study_polls`
- `id`, `content_id`, `scope` (`auction` | `lead` | `play` | `general`),
- `question`, `options_json`, `is_closed`, timestamps.

5. `deal_study_poll_votes`
- `id`, `poll_id`, `user_id`, `option_id`, timestamps,
- unique (`poll_id`, `user_id`).

Comments reuse existing discussion model where possible, with optional anchor fields for deal context.

## API/Service Direction

- `dealStudio.get(contentId)` returns full study payload + ACL capabilities.
- `dealStudio.upsertDraft(contentId, payload)` saves validated draft.
- `dealStudio.setMask(contentId, mask)` updates visibility policy.
- `dealStudio.savePlayStep(contentId, step)` upserts trick timeline.
- `dealStudio.upsertDdSnapshot(contentId, payload)` stores DD output/import.
- `dealStudio.createPoll(contentId, poll)` / `votePoll(pollId, optionId)`.
- `dealStudio.listComments(contentId)` / `addComment(contentId, payload)` using existing discussion service.

## Security and ACL

- Read capability:
  - follows content visibility + space membership policy.
- Write capability:
  - owner/admin/editor of the space.
- Poll vote/comment capability:
  - authenticated users with view permission and policy-allowed interaction.
- Mask visibility evaluated server-side; do not trust client-only hiding.

## Risks

- Risk: scope grows into full learning platform in one PR.
  - Mitigation: phase delivery with strict F01..F08 boundaries.
- Risk: DD integration latency or external dependency instability.
  - Mitigation: support import mode and async snapshot status.
- Risk: data model over-normalization slows UX iteration.
  - Mitigation: JSON-first payload for rapid iteration, add query projections later.

## Exit Criteria

- Phase tasks in `tasks.md` complete.
- UI contract implemented for core study path.
- ACL behavior verified for guest/member/editor/owner.
- Quality gates pass and rollout note added.
