# Bounded Contexts

Last updated: 2026-03-08

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

## 6) Discovery and Search

- Responsibility:
  - indexing and search over systems and notes,
  - saved search views.
- Core entities:
  - `SearchDocument`, `SavedQuery`, `SmartView`.
- Owns:
  - search schema and ranking behavior.

## 7) Notification and Bot Integration

- Responsibility:
  - Telegram bot events,
  - deep-link routing,
  - async notifications.
- Core entities:
  - `BotEvent`, `NotificationDelivery`, `TelegramUserLink`.
- Owns:
  - channel-specific message and delivery contracts.

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

Search and bot contexts can evolve incrementally after persistence/auth baseline is stable.
