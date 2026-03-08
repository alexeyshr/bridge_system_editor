# Data Model: Persistent Multi-User Workspace

## Entity: User

- `id` (string, UUID, PK)
- `email` (string, unique, required)
- `name` (string, optional)
- `passwordHash` (string, required for credentials auth)
- `telegramUsername` (string, optional)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)

## Entity: AuthAccount

- `id` (string, UUID, PK)
- `userId` (FK -> User.id, required, indexed)
- `provider` (enum: `credentials` | `telegram`, required)
- `providerAccountId` (string, required)
- `createdAt` (datetime, required)
- Unique constraint: (`provider`, `providerAccountId`)

## Entity: BiddingSystem

- `id` (string, UUID, PK)
- `ownerId` (FK -> User.id, required)
- `title` (string, required)
- `description` (string, optional)
- `schemaVersion` (integer, required)
- `revision` (integer, required, default `1`)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)
- `updatedBy` (FK -> User.id, required)

## Entity: BiddingNode

- `id` (string, UUID, PK)
- `systemId` (FK -> BiddingSystem.id, required, indexed)
- `sequenceId` (string, unique within `systemId`, required)  
  Example: `"1C 1D 1H"`
- `payload` (JSON, required)  
  Stores all semantic fields currently in frontend node model.
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)
- `updatedBy` (FK -> User.id, required)

## Entity: SystemShare

- `id` (string, UUID, PK)
- `systemId` (FK -> BiddingSystem.id, required, indexed)
- `userId` (FK -> User.id, required, indexed)
- `role` (enum: `viewer` | `editor`, required)
- `createdAt` (datetime, required)
- Unique constraint: (`systemId`, `userId`)

## Entity: ShareInvite

- `id` (string, UUID, PK)
- `systemId` (FK -> BiddingSystem.id, required, indexed)
- `createdBy` (FK -> User.id, required)
- `role` (enum: `viewer` | `editor`, required)
- `channel` (enum: `email` | `internal` | `telegram`, required)
- `targetEmail` (string, optional)
- `targetUserId` (FK -> User.id, optional)
- `targetTelegramUsername` (string, optional)
- `token` (string, unique, required)
- `status` (enum: `pending` | `accepted` | `revoked` | `expired`, required)
- `expiresAt` (datetime, required)
- `acceptedAt` (datetime, optional)
- `acceptedBy` (FK -> User.id, optional)
- `createdAt` (datetime, required)

## Entity: SystemRevision

- `id` (string, UUID, PK)
- `systemId` (FK -> BiddingSystem.id, required, indexed)
- `revision` (integer, required)
- `diff` (JSON, optional)
- `createdBy` (FK -> User.id, required)
- `createdAt` (datetime, required)

## Relationships

- One `User` owns many `BiddingSystem`.
- One `User` has many `AuthAccount` records.
- One `BiddingSystem` has many `BiddingNode`.
- One `BiddingSystem` has many `SystemShare`.
- One `BiddingSystem` has many `ShareInvite`.
- One `BiddingSystem` has many `SystemRevision`.
- Shared user access is read from `SystemShare`; owner implicit full access.

## Validation Rules

- `sequenceId` must be non-empty and must match canonical sequence format used by UI.
- `schemaVersion` must be a known supported version.
- `payload.context.sequence` must stay consistent with `sequenceId`.
- `editor` can write nodes/metadata; `viewer` can only read.
- `ShareInvite.channel=internal` requires `targetUserId`.
- `ShareInvite.channel=email` requires `targetEmail`.
- `ShareInvite.channel=telegram` requires `targetTelegramUsername` (or link to user with telegram identity).
