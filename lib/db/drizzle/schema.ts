import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const shareRoleEnum = pgEnum('share_role', ['viewer', 'reviewer', 'editor']);
export const inviteChannelEnum = pgEnum('invite_channel', ['email', 'internal', 'telegram']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'revoked', 'expired']);
export const tournamentBindingScopeEnum = pgEnum('tournament_binding_scope', ['global', 'pair', 'team']);
export const tournamentBindingStatusEnum = pgEnum('tournament_binding_status', ['active', 'frozen']);

export const users = pgTable('users', {
  id: varchar('id', { length: 191 }).primaryKey(),
  email: varchar('email', { length: 255 }),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 120 }),
  telegramUsername: varchar('telegram_username', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailUnique: uniqueIndex('users_email_unique').on(table.email),
}));

export const authAccounts = pgTable('auth_accounts', {
  id: varchar('id', { length: 191 }).primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 191 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  providerAccountUnique: uniqueIndex('auth_accounts_provider_account_unique').on(table.provider, table.providerAccountId),
  userIdIdx: index('auth_accounts_user_id_idx').on(table.userId),
}));

export const biddingSystems = pgTable('bidding_systems', {
  id: varchar('id', { length: 191 }).primaryKey(),
  ownerId: varchar('owner_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 120 }).notNull(),
  description: text('description'),
  schemaVersion: integer('schema_version').notNull().default(1),
  revision: integer('revision').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedById: varchar('updated_by_id', { length: 191 }).notNull().references(() => users.id),
}, (table) => ({
  ownerIdIdx: index('bidding_systems_owner_id_idx').on(table.ownerId),
  updatedByIdIdx: index('bidding_systems_updated_by_id_idx').on(table.updatedById),
}));

export const biddingNodes = pgTable('bidding_nodes', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  sequenceId: varchar('sequence_id', { length: 500 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedById: varchar('updated_by_id', { length: 191 }).notNull().references(() => users.id),
}, (table) => ({
  systemSequenceUnique: uniqueIndex('bidding_nodes_system_sequence_unique').on(table.systemId, table.sequenceId),
  systemIdIdx: index('bidding_nodes_system_id_idx').on(table.systemId),
  updatedByIdIdx: index('bidding_nodes_updated_by_id_idx').on(table.updatedById),
}));

export const systemShares = pgTable('system_shares', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: shareRoleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  systemUserUnique: uniqueIndex('system_shares_system_user_unique').on(table.systemId, table.userId),
  systemIdIdx: index('system_shares_system_id_idx').on(table.systemId),
  userIdIdx: index('system_shares_user_id_idx').on(table.userId),
}));

export const shareInvites = pgTable('share_invites', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  createdById: varchar('created_by_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: shareRoleEnum('role').notNull(),
  channel: inviteChannelEnum('channel').notNull(),
  targetEmail: varchar('target_email', { length: 255 }),
  targetUserId: varchar('target_user_id', { length: 191 }).references(() => users.id, { onDelete: 'set null' }),
  targetTelegramUsername: varchar('target_telegram_username', { length: 64 }),
  token: varchar('token', { length: 191 }).notNull(),
  status: inviteStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedById: varchar('accepted_by_id', { length: 191 }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenUnique: uniqueIndex('share_invites_token_unique').on(table.token),
  systemStatusIdx: index('share_invites_system_status_idx').on(table.systemId, table.status),
  targetUserIdIdx: index('share_invites_target_user_id_idx').on(table.targetUserId),
}));

export const systemRevisions = pgTable('system_revisions', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull(),
  diff: jsonb('diff'),
  createdById: varchar('created_by_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  systemRevisionUnique: uniqueIndex('system_revisions_system_revision_unique').on(table.systemId, table.revision),
  systemIdIdx: index('system_revisions_system_id_idx').on(table.systemId),
}));

export const systemVersions = pgTable('system_versions', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  label: varchar('label', { length: 120 }),
  notes: text('notes'),
  sourceRevision: integer('source_revision').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  publishedById: varchar('published_by_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  systemVersionUnique: uniqueIndex('system_versions_system_version_unique').on(table.systemId, table.versionNumber),
  systemIdIdx: index('system_versions_system_id_idx').on(table.systemId),
  publishedByIdIdx: index('system_versions_published_by_id_idx').on(table.publishedById),
}));

export const systemDrafts = pgTable('system_drafts', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  baseVersionId: varchar('base_version_id', { length: 191 }).references(() => systemVersions.id, { onDelete: 'set null' }),
  draftRevision: integer('draft_revision').notNull().default(1),
  updatedById: varchar('updated_by_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  systemUnique: uniqueIndex('system_drafts_system_unique').on(table.systemId),
  baseVersionIdIdx: index('system_drafts_base_version_id_idx').on(table.baseVersionId),
  updatedByIdIdx: index('system_drafts_updated_by_id_idx').on(table.updatedById),
}));

export const tournamentSystemBindings = pgTable('tournament_system_bindings', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  tournamentId: varchar('tournament_id', { length: 191 }).notNull(),
  scopeType: tournamentBindingScopeEnum('scope_type').notNull().default('global'),
  scopeId: varchar('scope_id', { length: 191 }).notNull().default(''),
  versionId: varchar('version_id', { length: 191 }).notNull().references(() => systemVersions.id, { onDelete: 'restrict' }),
  status: tournamentBindingStatusEnum('status').notNull().default('active'),
  boundById: varchar('bound_by_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  boundAt: timestamp('bound_at', { withTimezone: true }).notNull().defaultNow(),
  frozenAt: timestamp('frozen_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueBindingScope: uniqueIndex('tournament_system_bindings_unique_scope').on(
    table.systemId,
    table.tournamentId,
    table.scopeType,
    table.scopeId,
  ),
  systemTournamentIdx: index('tournament_system_bindings_system_tournament_idx').on(table.systemId, table.tournamentId),
  versionIdIdx: index('tournament_system_bindings_version_id_idx').on(table.versionId),
  boundByIdIdx: index('tournament_system_bindings_bound_by_id_idx').on(table.boundById),
}));

export const schema = {
  users,
  authAccounts,
  biddingSystems,
  biddingNodes,
  systemShares,
  shareInvites,
  systemRevisions,
  systemVersions,
  systemDrafts,
  tournamentSystemBindings,
};

export type ShareRole = (typeof shareRoleEnum.enumValues)[number];
export type InviteChannel = (typeof inviteChannelEnum.enumValues)[number];
export type InviteStatus = (typeof inviteStatusEnum.enumValues)[number];
export type TournamentBindingScope = (typeof tournamentBindingScopeEnum.enumValues)[number];
export type TournamentBindingStatus = (typeof tournamentBindingStatusEnum.enumValues)[number];
