import type { SystemTemplateId } from '@/lib/system-templates';

export type AccessRole = 'owner' | 'editor' | 'viewer' | 'none';

export type ResolvedAccess = {
  role: AccessRole;
  systemExists: boolean;
};

export type ShareRole = 'viewer' | 'editor';
export type InviteChannel = 'email' | 'internal' | 'telegram';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type TournamentBindingScope = 'global' | 'pair' | 'team';
export type TournamentBindingStatus = 'active' | 'frozen';

export interface SystemsDriver {
  resolveSystemAccess(systemId: string, userId: string): Promise<ResolvedAccess>;
  listSystemsForUser(userId: string): Promise<Array<{
    id: string;
    title: string;
    description: string | null;
    schemaVersion: number;
    revision: number;
    updatedAt: string;
    role: 'owner' | 'editor' | 'viewer';
  }>>;
  createSystemForUser(
    userId: string,
    input: { title: string; description?: string | null; templateId?: SystemTemplateId },
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    schemaVersion: number;
    revision: number;
    role: 'owner';
    createdAt: string;
    updatedAt: string;
  }>;
  getSystemForUser(systemId: string, userId: string): Promise<{
    id: string;
    title: string;
    description: string | null;
    schemaVersion: number;
    revision: number;
    role: 'owner' | 'editor' | 'viewer';
    updatedAt: string;
    nodes: Array<{
      sequenceId: string;
      payload: unknown;
      updatedAt: string;
    }>;
  }>;
  updateSystemMetadata(
    systemId: string,
    userId: string,
    input: { title?: string; description?: string | null; schemaVersion?: number },
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    schemaVersion: number;
    revision: number;
    updatedAt: string;
  }>;
  upsertSystemNodes(
    systemId: string,
    userId: string,
    input: {
      nodes: Array<{ sequenceId: string; payload: unknown }>;
      removeSequenceIds?: string[];
      baseRevision?: number;
    },
  ): Promise<{
    revision: number;
    upserted: number;
    removed: number;
  }>;
  listSystemShares(systemId: string, userId: string): Promise<Array<{
    id: string;
    role: ShareRole;
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      displayName: string | null;
      telegramUsername: string | null;
    };
  }>>;
  upsertSystemShare(
    systemId: string,
    ownerId: string,
    input: { role: ShareRole; userId?: string; email?: string },
  ): Promise<{
    id: string;
    role: ShareRole;
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      displayName: string | null;
      telegramUsername: string | null;
    };
  }>;
  listSystemVersions(
    systemId: string,
    userId: string,
  ): Promise<Array<{
    id: string;
    systemId: string;
    versionNumber: number;
    label: string | null;
    notes: string | null;
    sourceRevision: number;
    publishedAt: string;
    publishedBy: {
      id: string;
      email: string | null;
      displayName: string | null;
    };
  }>>;
  publishSystemVersion(
    systemId: string,
    userId: string,
    input: {
      label?: string | null;
      notes?: string | null;
    },
  ): Promise<{
    id: string;
    systemId: string;
    versionNumber: number;
    label: string | null;
    notes: string | null;
    sourceRevision: number;
    publishedAt: string;
  }>;
  createDraftFromVersion(
    systemId: string,
    userId: string,
    versionId: string,
  ): Promise<{
    systemId: string;
    versionId: string;
    versionNumber: number;
    revision: number;
    restoredNodes: number;
  }>;
  compareDraftWithVersion(
    systemId: string,
    userId: string,
    versionId: string,
  ): Promise<{
    systemId: string;
    draftRevision: number;
    versionId: string;
    versionNumber: number;
    sourceRevision: number;
    summary: {
      added: number;
      removed: number;
      changed: number;
      unchanged: number;
    };
    addedSequenceIds: string[];
    removedSequenceIds: string[];
    changedSequenceIds: string[];
  }>;
  listTournamentBindings(
    systemId: string,
    userId: string,
    input?: {
      tournamentId?: string;
    },
  ): Promise<Array<{
    id: string;
    tournamentId: string;
    scopeType: TournamentBindingScope;
    scopeId: string;
    status: TournamentBindingStatus;
    systemId: string;
    versionId: string;
    versionNumber: number;
    boundAt: string;
    frozenAt: string | null;
    updatedAt: string;
  }>>;
  upsertTournamentBinding(
    systemId: string,
    userId: string,
    input: {
      tournamentId: string;
      scopeType: TournamentBindingScope;
      scopeId?: string;
      versionId: string;
    },
  ): Promise<{
    id: string;
    tournamentId: string;
    scopeType: TournamentBindingScope;
    scopeId: string;
    status: TournamentBindingStatus;
    systemId: string;
    versionId: string;
    versionNumber: number;
    boundAt: string;
    frozenAt: string | null;
    updatedAt: string;
  }>;
  freezeTournamentBinding(
    systemId: string,
    userId: string,
    bindingId: string,
  ): Promise<{
    id: string;
    status: 'frozen';
    frozenAt: string;
    updatedAt: string;
  }>;
}

export interface InvitesDriver {
  listInvitesForSystem(systemId: string, ownerId: string): Promise<Array<{
    id: string;
    token: string;
    role: ShareRole;
    channel: InviteChannel;
    status: InviteStatus;
    targetEmail: string | null;
    targetTelegramUsername: string | null;
    targetUser: {
      id: string;
      email: string | null;
      displayName: string | null;
      telegramUsername: string | null;
    } | null;
    acceptedBy: {
      id: string;
      email: string | null;
      displayName: string | null;
    } | null;
    createdAt: string;
    expiresAt: string;
    acceptedAt: string | null;
    webInviteUrl: string;
    telegramInviteUrl: string | null;
  }>>;
  createInviteForSystem(
    systemId: string,
    ownerId: string,
    input: {
      channel: InviteChannel;
      role: ShareRole;
      targetEmail?: string;
      targetUserId?: string;
      targetTelegramUsername?: string;
      expiresInHours: number;
    },
  ): Promise<{
    id: string;
    channel: InviteChannel;
    role: ShareRole;
    status: InviteStatus;
    token: string;
    webInviteUrl: string;
    telegramInviteUrl: string | null;
    expiresAt: string;
    delivery: {
      status: 'queued';
      channel: InviteChannel;
      message: string;
    };
  }>;
  acceptInviteToken(token: string, userId: string): Promise<{
    systemId: string;
    role: ShareRole;
    status: 'accepted';
  }>;
}
