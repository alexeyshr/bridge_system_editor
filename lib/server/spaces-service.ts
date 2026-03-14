import crypto from 'node:crypto';
import { db } from '@/lib/db/drizzle/client';
import {
  spaces,
  spaceInvites,
  spaceJoinRequests,
  spaceMembers,
  users,
  type PortalGlobalRole,
  type SpaceInviteStatus,
  type SpaceJoinPolicy,
  type SpaceJoinRequestStatus,
  type SpaceMemberRole,
  type SpaceReviewPolicy,
  type SpaceType,
  type SpaceVisibility,
} from '@/lib/db/drizzle/schema';
import { and, desc, eq, ilike, lt, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { AccessDeniedError, InvalidStateError, NotFoundError, UserLookupError } from './domain-errors';
import {
  canSpaceCapability,
  listSpaceCapabilitiesForRole,
  resolveSpaceActorRole,
  type SpaceAclResource,
  type SpaceAclSubject,
} from './space-acl';
import { createEntityId } from './utils/id';

type SpaceActorInput = {
  userId: string | null;
  globalRoles?: PortalGlobalRole[];
};

type SpaceRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  type: SpaceType;
  visibility: SpaceVisibility;
  joinPolicy: SpaceJoinPolicy;
  reviewPolicy: SpaceReviewPolicy;
  ownerUserId: string;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  memberRole: SpaceMemberRole | null;
};

export type SpaceView = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  type: SpaceType;
  visibility: SpaceVisibility;
  joinPolicy: SpaceJoinPolicy;
  reviewPolicy: SpaceReviewPolicy;
  ownerUserId: string;
  createdById: string;
  memberRole: SpaceMemberRole | null;
  actorRole: ReturnType<typeof resolveSpaceActorRole>;
  capabilities: ReturnType<typeof listSpaceCapabilitiesForRole>;
  createdAt: string;
  updatedAt: string;
};

export type SpaceJoinRequestView = {
  id: string;
  spaceId: string;
  userId: string;
  message: string | null;
  status: SpaceJoinRequestStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    telegramUsername: string | null;
  };
};

export type SpaceMyJoinRequestView = {
  id: string;
  spaceId: string;
  spaceName: string;
  status: SpaceJoinRequestStatus;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type SpaceInviteView = {
  id: string;
  spaceId: string;
  role: SpaceMemberRole;
  status: SpaceInviteStatus;
  targetEmail: string | null;
  targetUserId: string | null;
  token: string;
  webInviteUrl: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export async function ensurePersonalSpaceForUser(userId: string): Promise<{ id: string }> {
  const [existing] = await db
    .select({
      id: spaces.id,
    })
    .from(spaces)
    .where(and(eq(spaces.ownerUserId, userId), eq(spaces.type, 'personal')))
    .limit(1);

  if (existing) {
    await db.insert(spaceMembers).values({
      id: createEntityId('space_member'),
      spaceId: existing.id,
      userId,
      role: 'owner',
      invitedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing({
      target: [spaceMembers.spaceId, spaceMembers.userId],
    });

    return existing;
  }

  const createdAt = new Date();
  const id = createEntityId('space');
  await db.transaction(async (tx) => {
    await tx.insert(spaces).values({
      id,
      slug: null,
      name: 'Personal space',
      description: 'Default personal space',
      type: 'personal',
      visibility: 'hidden',
      joinPolicy: 'invite_only',
      reviewPolicy: 'none',
      ownerUserId: userId,
      createdById: userId,
      createdAt,
      updatedAt: createdAt,
    });

    await tx.insert(spaceMembers).values({
      id: createEntityId('space_member'),
      spaceId: id,
      userId,
      role: 'owner',
      invitedById: null,
      createdAt,
      updatedAt: createdAt,
    });
  });

  return { id };
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 191);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function getSpaceInviteUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/space-invite/${token}`;
}

function resolveSubject(input: SpaceActorInput): SpaceAclSubject {
  if (!input.userId) return { userId: null, globalRoles: [] };
  const globalRoles: PortalGlobalRole[] = input.globalRoles && input.globalRoles.length > 0
    ? [...new Set(input.globalRoles)]
    : ['user'];
  return {
    userId: input.userId,
    globalRoles,
  };
}

function toResource(row: SpaceRow): SpaceAclResource {
  return {
    visibility: row.visibility,
    joinPolicy: row.joinPolicy,
    ownerUserId: row.ownerUserId,
    memberRole: row.memberRole,
  };
}

function toSpaceView(row: SpaceRow, subject: SpaceAclSubject): SpaceView {
  const resource = toResource(row);
  const actorRole = resolveSpaceActorRole(subject, resource);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type,
    visibility: row.visibility,
    joinPolicy: row.joinPolicy,
    reviewPolicy: row.reviewPolicy,
    ownerUserId: row.ownerUserId,
    createdById: row.createdById,
    memberRole: row.memberRole,
    actorRole,
    capabilities: listSpaceCapabilitiesForRole(actorRole),
    createdAt: toIso(row.createdAt) as string,
    updatedAt: toIso(row.updatedAt) as string,
  };
}

async function getSpaceRowForActor(spaceId: string, actorUserId: string | null): Promise<SpaceRow | null> {
  if (!actorUserId) {
    const [row] = await db
      .select({
        id: spaces.id,
        slug: spaces.slug,
        name: spaces.name,
        description: spaces.description,
        type: spaces.type,
        visibility: spaces.visibility,
        joinPolicy: spaces.joinPolicy,
        reviewPolicy: spaces.reviewPolicy,
        ownerUserId: spaces.ownerUserId,
        createdById: spaces.createdById,
        createdAt: spaces.createdAt,
        updatedAt: spaces.updatedAt,
      })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    if (!row) return null;
    return { ...row, memberRole: null };
  }

  const [row] = await db
    .select({
      id: spaces.id,
      slug: spaces.slug,
      name: spaces.name,
      description: spaces.description,
      type: spaces.type,
      visibility: spaces.visibility,
      joinPolicy: spaces.joinPolicy,
      reviewPolicy: spaces.reviewPolicy,
      ownerUserId: spaces.ownerUserId,
      createdById: spaces.createdById,
      createdAt: spaces.createdAt,
      updatedAt: spaces.updatedAt,
      memberRole: spaceMembers.role,
    })
    .from(spaces)
    .leftJoin(spaceMembers, and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, actorUserId)))
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!row) return null;
  return row;
}

async function assertManageCapability(spaceId: string, actor: SpaceActorInput): Promise<SpaceRow> {
  const row = await getSpaceRowForActor(spaceId, actor.userId);
  if (!row) throw new NotFoundError('Space not found');
  const subject = resolveSubject(actor);
  if (!canSpaceCapability(subject, toResource(row), 'space.manage')) {
    throw new AccessDeniedError();
  }
  return row;
}

async function assertMembershipManageCapability(spaceId: string, actor: SpaceActorInput): Promise<SpaceRow> {
  const row = await getSpaceRowForActor(spaceId, actor.userId);
  if (!row) throw new NotFoundError('Space not found');
  const subject = resolveSubject(actor);
  if (!canSpaceCapability(subject, toResource(row), 'space.members.manage')) {
    throw new AccessDeniedError();
  }
  return row;
}

async function assertInviteManageCapability(spaceId: string, actor: SpaceActorInput): Promise<SpaceRow> {
  const row = await getSpaceRowForActor(spaceId, actor.userId);
  if (!row) throw new NotFoundError('Space not found');
  const subject = resolveSubject(actor);
  if (!canSpaceCapability(subject, toResource(row), 'space.invites.manage')) {
    throw new AccessDeniedError();
  }
  return row;
}

async function markExpiredSpaceInvites(spaceId?: string): Promise<void> {
  const now = new Date();
  if (spaceId) {
    await db
      .update(spaceInvites)
      .set({
        status: 'expired',
      })
      .where(
        and(
          eq(spaceInvites.spaceId, spaceId),
          eq(spaceInvites.status, 'pending'),
          lt(spaceInvites.expiresAt, now),
        ),
      );
    return;
  }

  await db
    .update(spaceInvites)
    .set({
      status: 'expired',
    })
    .where(and(eq(spaceInvites.status, 'pending'), lt(spaceInvites.expiresAt, now)));
}

export async function listSpacesForActor(
  actor: SpaceActorInput,
  input?: {
    query?: string;
  },
): Promise<SpaceView[]> {
  const subject = resolveSubject(actor);
  const queryText = input?.query?.trim();

  if (!actor.userId) {
    const rows = await db
      .select({
        id: spaces.id,
        slug: spaces.slug,
        name: spaces.name,
        description: spaces.description,
        type: spaces.type,
        visibility: spaces.visibility,
        joinPolicy: spaces.joinPolicy,
        reviewPolicy: spaces.reviewPolicy,
        ownerUserId: spaces.ownerUserId,
        createdById: spaces.createdById,
        createdAt: spaces.createdAt,
        updatedAt: spaces.updatedAt,
      })
      .from(spaces)
      .where(
        queryText
          ? and(
              eq(spaces.visibility, 'public'),
              or(
                ilike(spaces.name, `%${queryText}%`),
                ilike(spaces.description, `%${queryText}%`),
              ),
            )
          : eq(spaces.visibility, 'public'),
      )
      .orderBy(desc(spaces.updatedAt), desc(spaces.createdAt));

    return rows.map((row) => toSpaceView({ ...row, memberRole: null }, subject));
  }

  const rows = await db
    .select({
      id: spaces.id,
      slug: spaces.slug,
      name: spaces.name,
      description: spaces.description,
      type: spaces.type,
      visibility: spaces.visibility,
      joinPolicy: spaces.joinPolicy,
      reviewPolicy: spaces.reviewPolicy,
      ownerUserId: spaces.ownerUserId,
      createdById: spaces.createdById,
      createdAt: spaces.createdAt,
      updatedAt: spaces.updatedAt,
      memberRole: spaceMembers.role,
    })
    .from(spaces)
    .leftJoin(spaceMembers, and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, actor.userId)))
    .where(
      queryText
        ? and(
            or(
              eq(spaces.ownerUserId, actor.userId),
              eq(spaceMembers.userId, actor.userId),
              eq(spaces.visibility, 'public'),
            ),
            or(
              ilike(spaces.name, `%${queryText}%`),
              ilike(spaces.description, `%${queryText}%`),
            ),
          )
        : or(
            eq(spaces.ownerUserId, actor.userId),
            eq(spaceMembers.userId, actor.userId),
            eq(spaces.visibility, 'public'),
          ),
    )
    .orderBy(desc(spaces.updatedAt), desc(spaces.createdAt));

  return rows.map((row) => toSpaceView(row, subject));
}

export async function getSpaceForActor(spaceId: string, actor: SpaceActorInput): Promise<SpaceView> {
  const row = await getSpaceRowForActor(spaceId, actor.userId);
  if (!row) throw new NotFoundError('Space not found');

  const subject = resolveSubject(actor);
  if (!canSpaceCapability(subject, toResource(row), 'space.read')) {
    throw new AccessDeniedError();
  }

  return toSpaceView(row, subject);
}

export async function createSpaceForUser(
  userId: string,
  input: {
    name: string;
    description?: string | null;
    slug?: string;
    type: SpaceType;
    visibility: SpaceVisibility;
    joinPolicy: SpaceJoinPolicy;
    reviewPolicy: SpaceReviewPolicy;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<SpaceView> {
  if (input.type === 'personal') {
    const [existing] = await db
      .select({
        id: spaces.id,
      })
      .from(spaces)
      .where(and(eq(spaces.ownerUserId, userId), eq(spaces.type, 'personal')))
      .limit(1);

    if (existing) {
      throw new InvalidStateError('Personal space already exists');
    }
  }

  const id = createEntityId('space');
  const createdAt = new Date();
  const normalizedSlug = input.slug ? normalizeSlug(input.slug) : (
    input.type === 'team' ? normalizeSlug(input.name) : null
  );
  const visibility = input.type === 'personal' ? 'hidden' : input.visibility;
  const joinPolicy = input.type === 'personal' ? 'invite_only' : input.joinPolicy;

  await db.transaction(async (tx) => {
    await tx.insert(spaces).values({
      id,
      slug: normalizedSlug || null,
      name: input.name.trim(),
      description: input.description ?? null,
      type: input.type,
      visibility,
      joinPolicy,
      reviewPolicy: input.reviewPolicy,
      ownerUserId: userId,
      createdById: userId,
      createdAt,
      updatedAt: createdAt,
    });

    await tx.insert(spaceMembers).values({
      id: createEntityId('space_member'),
      spaceId: id,
      userId,
      role: 'owner',
      invitedById: null,
      createdAt,
      updatedAt: createdAt,
    });
  });

  return getSpaceForActor(id, { userId, globalRoles });
}

export async function updateSpaceForUser(
  spaceId: string,
  userId: string,
  input: {
    name?: string;
    description?: string | null;
    slug?: string;
    visibility?: SpaceVisibility;
    joinPolicy?: SpaceJoinPolicy;
    reviewPolicy?: SpaceReviewPolicy;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<SpaceView> {
  const row = await assertManageCapability(spaceId, { userId, globalRoles });
  const updatedAt = new Date();

  await db.update(spaces).set({
    name: input.name?.trim() ?? undefined,
    description: input.description,
    slug: input.slug !== undefined ? (normalizeSlug(input.slug) || null) : undefined,
    visibility: row.type === 'personal' ? 'hidden' : input.visibility,
    joinPolicy: row.type === 'personal' ? 'invite_only' : input.joinPolicy,
    reviewPolicy: input.reviewPolicy,
    updatedAt,
  }).where(eq(spaces.id, row.id));

  return getSpaceForActor(spaceId, { userId, globalRoles });
}

export async function createSpaceJoinRequest(
  spaceId: string,
  userId: string,
  input: {
    message?: string;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<{
  id: string;
  spaceId: string;
  userId: string;
  status: SpaceJoinRequestStatus;
  message: string | null;
  createdAt: string;
}> {
  const row = await getSpaceRowForActor(spaceId, userId);
  if (!row) throw new NotFoundError('Space not found');

  const subject = resolveSubject({ userId, globalRoles });
  const resource = toResource(row);

  if (!canSpaceCapability(subject, resource, 'space.join.request')) {
    throw new AccessDeniedError();
  }

  const [existing] = await db
    .select({
      id: spaceJoinRequests.id,
      status: spaceJoinRequests.status,
      message: spaceJoinRequests.message,
      createdAt: spaceJoinRequests.createdAt,
    })
    .from(spaceJoinRequests)
    .where(
      and(
        eq(spaceJoinRequests.spaceId, spaceId),
        eq(spaceJoinRequests.userId, userId),
        eq(spaceJoinRequests.status, 'pending'),
      ),
    )
    .orderBy(desc(spaceJoinRequests.createdAt))
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      spaceId,
      userId,
      status: existing.status,
      message: existing.message,
      createdAt: toIso(existing.createdAt) as string,
    };
  }

  const id = createEntityId('space_join');
  const createdAt = new Date();
  await db.insert(spaceJoinRequests).values({
    id,
    spaceId,
    userId,
    message: input.message?.trim() || null,
    status: 'pending',
    reviewedById: null,
    reviewedAt: null,
    createdAt,
    updatedAt: createdAt,
  });

  return {
    id,
    spaceId,
    userId,
    status: 'pending',
    message: input.message?.trim() || null,
    createdAt: createdAt.toISOString(),
  };
}

export async function listMySpaceJoinRequests(
  userId: string,
  input?: {
    status?: SpaceJoinRequestStatus;
  },
): Promise<SpaceMyJoinRequestView[]> {
  const rows = await db
    .select({
      id: spaceJoinRequests.id,
      spaceId: spaceJoinRequests.spaceId,
      spaceName: spaces.name,
      status: spaceJoinRequests.status,
      message: spaceJoinRequests.message,
      createdAt: spaceJoinRequests.createdAt,
      reviewedAt: spaceJoinRequests.reviewedAt,
    })
    .from(spaceJoinRequests)
    .innerJoin(spaces, eq(spaces.id, spaceJoinRequests.spaceId))
    .where(
      input?.status
        ? and(eq(spaceJoinRequests.userId, userId), eq(spaceJoinRequests.status, input.status))
        : eq(spaceJoinRequests.userId, userId),
    )
    .orderBy(desc(spaceJoinRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    spaceId: row.spaceId,
    spaceName: row.spaceName,
    status: row.status,
    message: row.message,
    createdAt: toIso(row.createdAt) as string,
    reviewedAt: toIso(row.reviewedAt),
  }));
}

export async function listSpaceJoinRequests(
  spaceId: string,
  userId: string,
  input?: {
    status?: SpaceJoinRequestStatus;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<SpaceJoinRequestView[]> {
  await assertMembershipManageCapability(spaceId, { userId, globalRoles });

  const requester = alias(users, 'requester_user');
  const rows = await db
    .select({
      id: spaceJoinRequests.id,
      spaceId: spaceJoinRequests.spaceId,
      userId: spaceJoinRequests.userId,
      message: spaceJoinRequests.message,
      status: spaceJoinRequests.status,
      reviewedById: spaceJoinRequests.reviewedById,
      reviewedAt: spaceJoinRequests.reviewedAt,
      createdAt: spaceJoinRequests.createdAt,
      updatedAt: spaceJoinRequests.updatedAt,
      requesterId: requester.id,
      requesterEmail: requester.email,
      requesterDisplayName: requester.displayName,
      requesterTelegramUsername: requester.telegramUsername,
    })
    .from(spaceJoinRequests)
    .innerJoin(requester, eq(spaceJoinRequests.userId, requester.id))
    .where(
      input?.status
        ? and(eq(spaceJoinRequests.spaceId, spaceId), eq(spaceJoinRequests.status, input.status))
        : eq(spaceJoinRequests.spaceId, spaceId),
    )
    .orderBy(desc(spaceJoinRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    spaceId: row.spaceId,
    userId: row.userId,
    message: row.message,
    status: row.status,
    reviewedById: row.reviewedById,
    reviewedAt: toIso(row.reviewedAt),
    createdAt: toIso(row.createdAt) as string,
    updatedAt: toIso(row.updatedAt) as string,
    user: {
      id: row.requesterId,
      email: row.requesterEmail,
      displayName: row.requesterDisplayName,
      telegramUsername: row.requesterTelegramUsername,
    },
  }));
}

export async function reviewSpaceJoinRequest(
  spaceId: string,
  requestId: string,
  userId: string,
  decision: 'approve' | 'reject',
  globalRoles?: PortalGlobalRole[],
): Promise<{
  requestId: string;
  status: SpaceJoinRequestStatus;
  reviewedAt: string;
  memberGranted: boolean;
}> {
  await assertMembershipManageCapability(spaceId, { userId, globalRoles });

  const [request] = await db
    .select({
      id: spaceJoinRequests.id,
      spaceId: spaceJoinRequests.spaceId,
      userId: spaceJoinRequests.userId,
      status: spaceJoinRequests.status,
    })
    .from(spaceJoinRequests)
    .where(and(eq(spaceJoinRequests.id, requestId), eq(spaceJoinRequests.spaceId, spaceId)))
    .limit(1);

  if (!request) throw new NotFoundError('Join request not found');
  if (request.status !== 'pending') throw new InvalidStateError('Join request already processed');

  const status: SpaceJoinRequestStatus = decision === 'approve' ? 'approved' : 'rejected';
  const reviewedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(spaceJoinRequests)
      .set({
        status,
        reviewedById: userId,
        reviewedAt,
        updatedAt: reviewedAt,
      })
      .where(eq(spaceJoinRequests.id, request.id));

    if (decision === 'approve') {
      await tx
        .insert(spaceMembers)
        .values({
          id: createEntityId('space_member'),
          spaceId,
          userId: request.userId,
          role: 'member',
          invitedById: userId,
          createdAt: reviewedAt,
          updatedAt: reviewedAt,
        })
        .onConflictDoNothing({
          target: [spaceMembers.spaceId, spaceMembers.userId],
        });
    }
  });

  return {
    requestId: request.id,
    status,
    reviewedAt: reviewedAt.toISOString(),
    memberGranted: decision === 'approve',
  };
}

export async function listSpaceInvites(
  spaceId: string,
  userId: string,
  input?: {
    status?: SpaceInviteStatus;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<SpaceInviteView[]> {
  await assertInviteManageCapability(spaceId, { userId, globalRoles });
  await markExpiredSpaceInvites(spaceId);

  const rows = await db
    .select({
      id: spaceInvites.id,
      spaceId: spaceInvites.spaceId,
      role: spaceInvites.role,
      status: spaceInvites.status,
      targetEmail: spaceInvites.targetEmail,
      targetUserId: spaceInvites.targetUserId,
      token: spaceInvites.token,
      expiresAt: spaceInvites.expiresAt,
      acceptedAt: spaceInvites.acceptedAt,
      revokedAt: spaceInvites.revokedAt,
      createdAt: spaceInvites.createdAt,
    })
    .from(spaceInvites)
    .where(
      input?.status
        ? and(eq(spaceInvites.spaceId, spaceId), eq(spaceInvites.status, input.status))
        : eq(spaceInvites.spaceId, spaceId),
    )
    .orderBy(desc(spaceInvites.createdAt));

  return rows.map((row) => ({
    id: row.id,
    spaceId: row.spaceId,
    role: row.role,
    status: row.status,
    targetEmail: row.targetEmail,
    targetUserId: row.targetUserId,
    token: row.token,
    webInviteUrl: getSpaceInviteUrl(row.token),
    expiresAt: toIso(row.expiresAt) as string,
    acceptedAt: toIso(row.acceptedAt),
    revokedAt: toIso(row.revokedAt),
    createdAt: toIso(row.createdAt) as string,
  }));
}

export async function createSpaceInvite(
  spaceId: string,
  userId: string,
  input: {
    role: Extract<SpaceMemberRole, 'admin' | 'editor' | 'member'>;
    targetUserId?: string;
    targetEmail?: string;
    expiresInHours: number;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<SpaceInviteView> {
  await assertInviteManageCapability(spaceId, { userId, globalRoles });
  await markExpiredSpaceInvites(spaceId);

  const normalizedEmail = input.targetEmail?.trim().toLowerCase() || null;
  const targetUserId = input.targetUserId ?? null;
  if (!normalizedEmail && !targetUserId) {
    throw new UserLookupError('Either targetUserId or targetEmail is required');
  }

  if (targetUserId) {
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) throw new UserLookupError('Target user does not exist');
  }

  const id = createEntityId('space_invite');
  const token = generateToken();
  const createdAt = new Date();
  const expiresAt = addHours(createdAt, input.expiresInHours);

  await db.insert(spaceInvites).values({
    id,
    spaceId,
    createdById: userId,
    role: input.role,
    targetUserId,
    targetEmail: normalizedEmail,
    token,
    status: 'pending',
    expiresAt,
    acceptedAt: null,
    revokedAt: null,
    acceptedById: null,
    createdAt,
  });

  return {
    id,
    spaceId,
    role: input.role,
    status: 'pending',
    targetEmail: normalizedEmail,
    targetUserId,
    token,
    webInviteUrl: getSpaceInviteUrl(token),
    expiresAt: expiresAt.toISOString(),
    acceptedAt: null,
    revokedAt: null,
    createdAt: createdAt.toISOString(),
  };
}

export async function revokeSpaceInvite(
  spaceId: string,
  inviteId: string,
  userId: string,
  globalRoles?: PortalGlobalRole[],
): Promise<{
  id: string;
  status: SpaceInviteStatus;
  revokedAt: string;
}> {
  await assertInviteManageCapability(spaceId, { userId, globalRoles });
  await markExpiredSpaceInvites(spaceId);

  const [invite] = await db
    .select({
      id: spaceInvites.id,
      status: spaceInvites.status,
    })
    .from(spaceInvites)
    .where(and(eq(spaceInvites.spaceId, spaceId), eq(spaceInvites.id, inviteId)))
    .limit(1);

  if (!invite) throw new NotFoundError('Invite not found');
  if (invite.status !== 'pending') throw new InvalidStateError('Only pending invite can be revoked');

  const revokedAt = new Date();
  await db
    .update(spaceInvites)
    .set({
      status: 'revoked',
      revokedAt,
    })
    .where(eq(spaceInvites.id, invite.id));

  return {
    id: invite.id,
    status: 'revoked',
    revokedAt: revokedAt.toISOString(),
  };
}

export async function acceptSpaceInviteToken(
  token: string,
  userId: string,
  actorEmail: string | null | undefined,
): Promise<{
  spaceId: string;
  role: SpaceMemberRole;
  status: SpaceInviteStatus;
}> {
  await markExpiredSpaceInvites();

  const [invite] = await db
    .select({
      id: spaceInvites.id,
      spaceId: spaceInvites.spaceId,
      role: spaceInvites.role,
      status: spaceInvites.status,
      targetUserId: spaceInvites.targetUserId,
      targetEmail: spaceInvites.targetEmail,
      expiresAt: spaceInvites.expiresAt,
    })
    .from(spaceInvites)
    .where(eq(spaceInvites.token, token))
    .limit(1);

  if (!invite) throw new NotFoundError('Invite not found');
  if (invite.status !== 'pending') throw new AccessDeniedError();

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    await db
      .update(spaceInvites)
      .set({ status: 'expired' })
      .where(eq(spaceInvites.id, invite.id));
    throw new NotFoundError('Invite expired');
  }

  if (invite.targetUserId && invite.targetUserId !== userId) {
    throw new AccessDeniedError();
  }

  if (invite.targetEmail) {
    if (!actorEmail) throw new AccessDeniedError();
    if (invite.targetEmail.toLowerCase() !== actorEmail.toLowerCase()) {
      throw new AccessDeniedError();
    }
  }

  const acceptedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(spaceMembers)
      .values({
        id: createEntityId('space_member'),
        spaceId: invite.spaceId,
        userId,
        role: invite.role,
        invitedById: null,
        createdAt: acceptedAt,
        updatedAt: acceptedAt,
      })
      .onConflictDoNothing({
        target: [spaceMembers.spaceId, spaceMembers.userId],
      });

    await tx
      .update(spaceInvites)
      .set({
        status: 'accepted',
        acceptedAt,
        acceptedById: userId,
      })
      .where(and(eq(spaceInvites.id, invite.id), eq(spaceInvites.status, 'pending')));
  });

  return {
    spaceId: invite.spaceId,
    role: invite.role,
    status: 'accepted',
  };
}
