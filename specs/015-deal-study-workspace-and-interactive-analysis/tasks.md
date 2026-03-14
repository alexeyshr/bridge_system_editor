# Tasks: PR-17 Deal Study Workspace and Interactive Analysis

Spec: `specs/015-deal-study-workspace-and-interactive-analysis/spec.md`  
Plan: `specs/015-deal-study-workspace-and-interactive-analysis/plan.md`

## Format: `[ID] [P?] [Phase] Description`

- `[P]`: parallelizable
- `[Phase]`: `F01..F08`

## F01 Single-surface Deal Studio shell

- [x] T1701 create dedicated Deal Studio route and central canvas layout
- [x] T1702 implement sticky top action rail (save/publish/share)
- [x] T1703 add capability-aware reader/editor mode toggles
- [x] T1704 align typography and spacing tokens to portal dense style

## F02 Hands composer (W/N/E/S) + validation

- [x] T1710 implement W/N/E/S hand editor with suit rows (`S/H/D/C`)
- [x] T1711 implement quick text parser and card picker mode
- [x] T1712 add full-deck validation (duplicates, missing cards, illegal symbols)
- [x] T1713 add dealer/vulnerability controls with normalized payload

## F03 Auction builder + lead picker

- [x] T1720 implement dual auction entry (quick text + bid pad)
- [x] T1721 enforce seat order and show next actor
- [x] T1722 add lead picker (suit + rank) and contract/result summary
- [x] T1723 persist auction and lead with normalized schema validation

## F04 Visibility masks and reveal policy

- [x] T1730 implement hand-level visibility mask controls
- [x] T1731 implement card-level mask controls
- [x] T1732 enforce mask policy server-side in read responses
- [x] T1733 add explicit viewer-state badges for masked studies

## F05 Play timeline (step-by-step)

- [x] T1740 implement trick timeline table and step navigation
- [x] T1741 support edit/insert/delete on trick steps
- [x] T1742 derive and validate leader/winner transitions
- [x] T1743 add compact replay mode for reader view

## F06 DD analysis panel

- [x] T1750 implement DD snapshot schema + storage
- [x] T1751 render DD matrix and par summary in study page
- [x] T1752 add DD import mode (manual/adapter input)
- [x] T1753 add async status/error states for optional solver integration

## F07 Narrative, comments, polls

- [x] T1760 add rich narrative composer with callouts and anchors
- [x] T1761 add threaded comments section under study
- [x] T1762 add poll create/vote flow for auction/lead/play scopes
- [x] T1763 add anchored links from comments/polls to analysis steps

## F08 Quality gate and rollout

- [x] T1770 run quality gates (`lint`, `typecheck`, `test`, `build`)
- [x] T1771 add integration tests for studio payload and ACL mask behavior
- [x] T1772 update roadmap/triage/bounded-context/spec traceability docs
- [x] T1773 add rollout note under `fix/*` and close phase issues in Linear
