# Bounded Contexts

Last updated: 2026-03-14

This document defines domain boundaries so models do not collapse into one mixed schema.

## Context Map

## 1) Identity and Access

- Responsibility:
  - authentication (email/password, Telegram link),
  - sessions,
  - user profile,
  - membership roles.
- Core entities:
  - `User`, `Session`, `IdentityLink`, `MembershipRole`.
- Owns:
  - who can access what.

## 2) Bidding System Editor

- Responsibility:
  - bidding tree CRUD,
  - node meanings,
  - sequence validation,
  - editor interactions and save semantics.
- Core entities:
  - `System`, `BiddingNode`, `SequencePath`, `NodeMeaning`.
- Owns:
  - domain rules for legal continuations and node metadata.

## 3) System Lifecycle and Versioning

- Responsibility:
  - system-level catalog (`Systems Hub`),
  - draft vs published lifecycle,
  - version compare and rollback semantics.
- Core entities:
  - `System`, `SystemDraft`, `SystemVersion`, `VersionDiff`.
- Owns:
  - publication flow and immutable version contracts.

## 4) Tournament Usage Binding

- Responsibility:
  - bind system versions to tournament contexts,
  - pair/team-specific assignment,
  - freeze rules after tournament start.
- Core entities:
  - `TournamentSystemBinding`, `BindingScope`, `BindingFreezePolicy`.
- Owns:
  - stable usage contract (`systemId + versionId`) for competitions.

## 5) Collaboration and Sharing

- Responsibility:
  - invites,
  - access grants,
  - sharing flows by email/internal lookup/Telegram,
  - discussion threads and mentions.
- Core entities:
  - `Invite`, `ShareGrant`, `PermissionSet`, `DiscussionThread`, `DiscussionMessage`.
- Owns:
  - collaboration lifecycle and invitation status,
  - conversation domain around systems and nodes.

## 6) Spaces and Content Publishing

- Responsibility:
  - space lifecycle (personal/team scope, visibility policy),
  - membership and join/invite flows,
  - content lifecycle (draft/published/archived),
  - content block schema and publication visibility.
- Core entities:
  - `Space`, `SpaceMembership`, `SpaceJoinRequest`, `SpaceInvite`,
  - `ContentItem`, `ContentVersion`, `ContentTag`, `ContentLink`.
- Owns:
  - where content lives,
  - who can see/publish content,
  - strict visibility rule enforcement (`hidden` space cannot publish public content).

## 7) Discovery and Search

- Responsibility:
  - indexing and search over systems and notes,
  - indexing and search over content and spaces,
  - saved search views.
- Core entities:
  - `SearchDocument`, `SavedQuery`, `SmartView`.
- Owns:
  - search schema and ranking behavior.

## 8) Notification and Bot Integration

- Responsibility:
  - Telegram bot events,
  - deep-link routing,
  - async notifications.
- Core entities:
  - `BotEvent`, `NotificationDelivery`, `TelegramUserLink`.
- Owns:
  - channel-specific message and delivery contracts.

## 9) Deal Study and Analysis Experience

- Responsibility:
  - bridge-native deal authoring surface,
  - W/N/E/S hands composition and masking,
  - auction, lead, and play timeline interaction,
  - DD snapshot presentation,
  - analysis-bound comments and polls.
- Core entities:
  - `DealStudy`, `DealHandMask`, `AuctionSequence`, `LeadSelection`,
  - `PlayStep`, `DoubleDummySnapshot`, `StudyPoll`.
- Owns:
  - the canonical UX and payload contract for study analysis flows,
  - rendering and interaction semantics for educational/tournament review studies.
- Traceability:
  - ADR: `docs/adr/ADR-0011-deal-study-workspace-and-interactive-analysis-model.md`
  - Spec: `specs/015-deal-study-workspace-and-interactive-analysis/`
  - Linear: `BRI-99..BRI-107`

## Integration Rules

- UI talks to API contracts, never directly to database drivers.
- Cross-context communication goes through explicit service interfaces or events.
- Avoid leaking internal persistence models between contexts.
- Keep context language aligned with `docs/GLOSSARY.md`.

## Current Priority Boundary

Near-term execution focuses on:
1. Identity and Access
2. Bidding System Editor
3. System Lifecycle and Versioning
4. Tournament Usage Binding
5. Collaboration and Sharing
6. Spaces and Content Publishing
7. Deal Study and Analysis Experience

Search and bot contexts can evolve incrementally after persistence/auth baseline is stable.
