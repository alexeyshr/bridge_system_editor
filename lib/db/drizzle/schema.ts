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
export const portalGlobalRoleEnum = pgEnum('portal_global_role', ['user', 'teacher', 'judge', 'organizer', 'admin']);
export const portalScopeTypeEnum = pgEnum('portal_scope_type', ['tournament', 'school']);
export const portalScopedRoleEnum = pgEnum('portal_scoped_role', ['teacher', 'judge', 'organizer', 'admin']);
export const inviteChannelEnum = pgEnum('invite_channel', ['email', 'internal', 'telegram']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'revoked', 'expired']);
export const tournamentBindingScopeEnum = pgEnum('tournament_binding_scope', ['global', 'pair', 'team']);
export const tournamentBindingStatusEnum = pgEnum('tournament_binding_status', ['active', 'frozen']);
export const discussionScopeEnum = pgEnum('discussion_scope', ['system', 'node']);
export const readOnlyLinkStatusEnum = pgEnum('read_only_link_status', ['active', 'revoked']);
export const notificationTypeEnum = pgEnum('notification_type', ['mention']);

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

export const userGlobalRoles = pgTable('user_global_roles', {
  id: varchar('id', { length: 191 }).primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: portalGlobalRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userRoleUnique: uniqueIndex('user_global_roles_user_role_unique').on(table.userId, table.role),
  userIdIdx: index('user_global_roles_user_id_idx').on(table.userId),
}));

export const userScopedRoles = pgTable('user_scoped_roles', {
  id: varchar('id', { length: 191 }).primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  scopeType: portalScopeTypeEnum('scope_type').notNull(),
  scopeId: varchar('scope_id', { length: 191 }).notNull(),
  role: portalScopedRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userScopeRoleUnique: uniqueIndex('user_scoped_roles_user_scope_role_unique').on(
    table.userId,
    table.scopeType,
    table.scopeId,
    table.role,
  ),
  userScopeIdx: index('user_scoped_roles_user_scope_idx').on(table.userId, table.scopeType, table.scopeId),
  scopeRoleIdx: index('user_scoped_roles_scope_role_idx').on(table.scopeType, table.scopeId, table.role),
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
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
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

export const discussionThreads = pgTable('discussion_threads', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  scope: discussionScopeEnum('scope').notNull().default('system'),
  scopeNodeId: varchar('scope_node_id', { length: 500 }),
  title: varchar('title', { length: 240 }),
  isResolved: boolean('is_resolved').notNull().default(false),
  createdById: varchar('created_by_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  systemScopeIdx: index('discussion_threads_system_scope_idx').on(table.systemId, table.scope),
  systemNodeIdx: index('discussion_threads_system_node_idx').on(table.systemId, table.scopeNodeId),
  createdByIdx: index('discussion_threads_created_by_idx').on(table.createdById),
}));

export const discussionMessages = pgTable('discussion_messages', {
  id: varchar('id', { length: 191 }).primaryKey(),
  threadId: varchar('thread_id', { length: 191 }).notNull().references(() => discussionThreads.id, { onDelete: 'cascade' }),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  authorId: varchar('author_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', { withTimezone: true }),
}, (table) => ({
  threadCreatedIdx: index('discussion_messages_thread_created_idx').on(table.threadId, table.createdAt),
  systemCreatedIdx: index('discussion_messages_system_created_idx').on(table.systemId, table.createdAt),
  authorIdx: index('discussion_messages_author_idx').on(table.authorId),
}));

export const discussionMentions = pgTable('discussion_mentions', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  threadId: varchar('thread_id', { length: 191 }).notNull().references(() => discussionThreads.id, { onDelete: 'cascade' }),
  messageId: varchar('message_id', { length: 191 }).notNull().references(() => discussionMessages.id, { onDelete: 'cascade' }),
  mentionedUserId: varchar('mentioned_user_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  mentionToken: varchar('mention_token', { length: 120 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  messageUserUnique: uniqueIndex('discussion_mentions_message_user_unique').on(table.messageId, table.mentionedUserId),
  mentionedUserIdx: index('discussion_mentions_mentioned_user_idx').on(table.mentionedUserId),
}));

export const notificationEvents = pgTable('notification_events', {
  id: varchar('id', { length: 191 }).primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  systemId: varchar('system_id', { length: 191 }).references(() => biddingSystems.id, { onDelete: 'set null' }),
  type: notificationTypeEnum('type').notNull().default('mention'),
  payload: jsonb('payload').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userReadIdx: index('notification_events_user_read_idx').on(table.userId, table.readAt),
  systemIdx: index('notification_events_system_idx').on(table.systemId),
}));

export const readOnlyPublishLinks = pgTable('read_only_publish_links', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).notNull().references(() => biddingSystems.id, { onDelete: 'cascade' }),
  versionId: varchar('version_id', { length: 191 }).notNull().references(() => systemVersions.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 191 }).notNull(),
  label: varchar('label', { length: 120 }),
  status: readOnlyLinkStatusEnum('status').notNull().default('active'),
  createdById: varchar('created_by_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastAccessAt: timestamp('last_access_at', { withTimezone: true }),
}, (table) => ({
  tokenUnique: uniqueIndex('read_only_publish_links_token_unique').on(table.token),
  systemStatusIdx: index('read_only_publish_links_system_status_idx').on(table.systemId, table.status),
  createdByIdx: index('read_only_publish_links_created_by_idx').on(table.createdById),
}));

export const auditEvents = pgTable('audit_events', {
  id: varchar('id', { length: 191 }).primaryKey(),
  systemId: varchar('system_id', { length: 191 }).references(() => biddingSystems.id, { onDelete: 'set null' }),
  actorUserId: varchar('actor_user_id', { length: 191 }).references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 120 }).notNull(),
  targetType: varchar('target_type', { length: 80 }).notNull(),
  targetId: varchar('target_id', { length: 191 }),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  systemActionIdx: index('audit_events_system_action_idx').on(table.systemId, table.action),
  actorIdx: index('audit_events_actor_idx').on(table.actorUserId),
  createdAtIdx: index('audit_events_created_at_idx').on(table.createdAt),
}));

export const bridgesportTournaments = pgTable('bridgesport_tournaments', {
  id: varchar('id', { length: 191 }).primaryKey(),
  sourceTournamentId: integer('source_tournament_id').notNull(),
  name: varchar('name', { length: 512 }).notNull(),
  year: integer('year'),
  sourceType: varchar('source_type', { length: 32 }),
  tournamentUrl: text('tournament_url'),
  resultsUrl: text('results_url'),
  resultsRows: integer('results_rows').notNull().default(0),
  startDate: timestamp('start_date', { withTimezone: true }),
  city: varchar('city', { length: 191 }),
  monthLabel: varchar('month_label', { length: 120 }),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourceTournamentIdUnique: uniqueIndex('bridgesport_tournaments_source_id_unique').on(table.sourceTournamentId),
  yearIdx: index('bridgesport_tournaments_year_idx').on(table.year),
  startDateIdx: index('bridgesport_tournaments_start_date_idx').on(table.startDate),
}));

export const bridgesportPlayers = pgTable('bridgesport_players', {
  id: varchar('id', { length: 191 }).primaryKey(),
  sourcePlayerId: integer('source_player_id').notNull(),
  name: varchar('name', { length: 191 }).notNull(),
  city: varchar('city', { length: 191 }),
  rank: varchar('rank', { length: 32 }),
  rating: integer('rating'),
  ratingPosition: integer('rating_position'),
  maxRatingPosition: integer('max_rating_position'),
  prizePoints: integer('prize_points'),
  masterPoints: integer('master_points'),
  onlineMasterPoints: integer('online_master_points'),
  gamblerNick: varchar('gambler_nick', { length: 120 }),
  bboNick: varchar('bbo_nick', { length: 120 }),
  club: varchar('club', { length: 255 }),
  tournamentsCount: integer('tournaments_count').notNull().default(0),
  profileUrl: text('profile_url'),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourcePlayerIdUnique: uniqueIndex('bridgesport_players_source_id_unique').on(table.sourcePlayerId),
  nameIdx: index('bridgesport_players_name_idx').on(table.name),
  ratingIdx: index('bridgesport_players_rating_idx').on(table.rating),
}));

export const bridgesportPlayerTournaments = pgTable('bridgesport_player_tournaments', {
  id: varchar('id', { length: 191 }).primaryKey(),
  sourcePlayerId: integer('source_player_id').notNull(),
  playerName: varchar('player_name', { length: 191 }),
  year: integer('year'),
  masterPoints: integer('master_points'),
  prizePoints: integer('prize_points'),
  ratingPoints: varchar('rating_points', { length: 64 }),
  place: varchar('place', { length: 64 }),
  partnerTeam: varchar('partner_team', { length: 255 }),
  tournament: varchar('tournament', { length: 512 }).notNull(),
  rowOrder: integer('row_order').notNull().default(0),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourcePlayerIdx: index('bridgesport_player_tournaments_source_player_idx').on(table.sourcePlayerId),
  sourcePlayerYearIdx: index('bridgesport_player_tournaments_source_player_year_idx').on(table.sourcePlayerId, table.year),
}));

export const bridgesportRatingSnapshots = pgTable('bridgesport_rating_snapshots', {
  id: varchar('id', { length: 191 }).primaryKey(),
  sourceRatingId: integer('source_rating_id').notNull(),
  ratingType: varchar('rating_type', { length: 32 }).notNull(),
  ratingTypeName: varchar('rating_type_name', { length: 120 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sourceUrl: text('source_url'),
  snapshotDate: timestamp('snapshot_date', { withTimezone: true }),
  entriesCount: integer('entries_count').notNull().default(0),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourceRatingIdUnique: uniqueIndex('bridgesport_rating_snapshots_source_id_unique').on(table.sourceRatingId),
  typeDateIdx: index('bridgesport_rating_snapshots_type_date_idx').on(table.ratingTypeName, table.snapshotDate),
}));

export const bridgesportCalendarTournaments = pgTable('bridgesport_calendar_tournaments', {
  id: varchar('id', { length: 191 }).primaryKey(),
  sourceTournamentId: integer('source_tournament_id').notNull(),
  name: varchar('name', { length: 512 }).notNull(),
  sourceUrl: text('source_url'),
  city: varchar('city', { length: 191 }),
  dateLabel: varchar('date_label', { length: 120 }),
  monthLabel: varchar('month_label', { length: 120 }),
  tournamentCategory: varchar('tournament_category', { length: 120 }),
  tournamentType: varchar('tournament_type', { length: 120 }),
  tournamentFormat: varchar('tournament_format', { length: 191 }),
  registrationOpen: boolean('registration_open').notNull().default(false),
  registeredCount: integer('registered_count'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  participantsCount: integer('participants_count').notNull().default(0),
  participants: jsonb('participants'),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourceTournamentIdUnique: uniqueIndex('bridgesport_calendar_tournaments_source_id_unique').on(table.sourceTournamentId),
  startDateIdx: index('bridgesport_calendar_tournaments_start_date_idx').on(table.startDate),
  cityIdx: index('bridgesport_calendar_tournaments_city_idx').on(table.city),
}));

export const schema = {
  users,
  authAccounts,
  userGlobalRoles,
  userScopedRoles,
  biddingSystems,
  biddingNodes,
  systemShares,
  shareInvites,
  systemRevisions,
  systemVersions,
  systemDrafts,
  tournamentSystemBindings,
  discussionThreads,
  discussionMessages,
  discussionMentions,
  notificationEvents,
  readOnlyPublishLinks,
  auditEvents,
  bridgesportTournaments,
  bridgesportPlayers,
  bridgesportPlayerTournaments,
  bridgesportRatingSnapshots,
  bridgesportCalendarTournaments,
};

export type ShareRole = (typeof shareRoleEnum.enumValues)[number];
export type PortalGlobalRole = (typeof portalGlobalRoleEnum.enumValues)[number];
export type PortalScopeType = (typeof portalScopeTypeEnum.enumValues)[number];
export type PortalScopedRole = (typeof portalScopedRoleEnum.enumValues)[number];
export type InviteChannel = (typeof inviteChannelEnum.enumValues)[number];
export type InviteStatus = (typeof inviteStatusEnum.enumValues)[number];
export type TournamentBindingScope = (typeof tournamentBindingScopeEnum.enumValues)[number];
export type TournamentBindingStatus = (typeof tournamentBindingStatusEnum.enumValues)[number];
export type DiscussionScope = (typeof discussionScopeEnum.enumValues)[number];
export type ReadOnlyLinkStatus = (typeof readOnlyLinkStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
