import assert from 'node:assert/strict';
import test from 'node:test';
import { TRPCError } from '@trpc/server';

import { AccessDeniedError } from '../../lib/server/domain-errors';
import type { SpaceCapability } from '../../lib/server/space-acl';
import type { SpaceView } from '../../lib/server/spaces-service';
import { createSpacesRouter, type SpacesRouterDeps } from '../../lib/trpc/routers/spaces';

function createDeps(overrides: Partial<SpacesRouterDeps> = {}): SpacesRouterDeps {
  const guestCapabilities: SpaceCapability[] = ['space.read', 'space.join.request'];
  const ownerCapabilities: SpaceCapability[] = ['space.read', 'space.manage'];
  const baseGuestSpace: SpaceView = {
    id: 'space-public',
    slug: 'public-club',
    name: 'Public Club',
    description: 'Open bridge community',
    type: 'team',
    visibility: 'public',
    joinPolicy: 'request',
    reviewPolicy: 'none',
    ownerUserId: 'owner-1',
    createdById: 'owner-1',
    memberRole: null,
    actorRole: 'guest',
    capabilities: guestCapabilities,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseDeps: SpacesRouterDeps = {
    listSpacesForActor: async (_actor: Parameters<SpacesRouterDeps['listSpacesForActor']>[0], _input: Parameters<SpacesRouterDeps['listSpacesForActor']>[1]) => [baseGuestSpace],
    getSpaceForActor: async (spaceId: string, _actor) => ({
      id: spaceId,
      slug: 'team-space',
      name: 'Team Space',
      description: null,
      type: 'team',
      visibility: 'hidden',
      joinPolicy: 'invite_only',
      reviewPolicy: 'none',
      ownerUserId: 'owner-1',
      createdById: 'owner-1',
      memberRole: 'member',
      actorRole: 'member',
      capabilities: ['space.read'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    createSpaceForUser: async (_userId: string, input: {
      name: string;
      description?: string | null;
      slug?: string;
      type: 'personal' | 'team';
      visibility: 'public' | 'hidden';
      joinPolicy: 'request' | 'invite_only';
      reviewPolicy: 'none' | 'required';
    }) => ({
      id: 'space-created',
      slug: input.slug ?? 'space-created',
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      visibility: input.visibility,
      joinPolicy: input.joinPolicy,
      reviewPolicy: input.reviewPolicy,
      ownerUserId: 'user-1',
      createdById: 'user-1',
      memberRole: 'owner',
      actorRole: 'owner',
      capabilities: ownerCapabilities,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    updateSpaceForUser: async (spaceId: string) => ({
      id: spaceId,
      slug: 'team-space',
      name: 'Updated Space',
      description: null,
      type: 'team',
      visibility: 'hidden',
      joinPolicy: 'invite_only',
      reviewPolicy: 'none',
      ownerUserId: 'user-1',
      createdById: 'user-1',
      memberRole: 'owner',
      actorRole: 'owner',
      capabilities: ownerCapabilities,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    createSpaceJoinRequest: async (spaceId: string, userId: string) => ({
      id: 'join-1',
      spaceId,
      userId,
      status: 'pending',
      message: null,
      createdAt: new Date().toISOString(),
    }),
    listMySpaceJoinRequests: async () => [
      {
        id: 'join-my-1',
        spaceId: 'space-public',
        spaceName: 'Public Club',
        status: 'pending',
        message: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      },
    ],
    listSpaceJoinRequests: async () => [],
    reviewSpaceJoinRequest: async (_spaceId: string, requestId: string, _userId: string, decision: 'approve' | 'reject') => ({
      requestId,
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewedAt: new Date().toISOString(),
      memberGranted: decision === 'approve',
    }),
    listSpaceInvites: async () => [],
    createSpaceInvite: async (spaceId: string, _userId: string, input: {
      role: 'admin' | 'editor' | 'member';
      targetUserId?: string;
      targetEmail?: string;
      expiresInHours: number;
    }) => ({
      id: 'invite-1',
      spaceId,
      role: input.role,
      status: 'pending',
      targetEmail: input.targetEmail ?? null,
      targetUserId: input.targetUserId ?? null,
      token: 'token-1',
      webInviteUrl: 'https://example.test/space-invite/token-1',
      expiresAt: new Date().toISOString(),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    }),
    revokeSpaceInvite: async (_spaceId: string, inviteId: string) => ({
      id: inviteId,
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    }),
    acceptSpaceInviteToken: async (token: string, _userId: string, _email?: string | null) => ({
      spaceId: 'space-1',
      role: 'member',
      status: 'accepted',
    }),
  };

  return {
    ...baseDeps,
    ...overrides,
  };
}

function createCaller(
  userId: string | null,
  overrides: Partial<SpacesRouterDeps> = {},
  sessionEmail?: string,
) {
  const router = createSpacesRouter(createDeps(overrides));
  return router.createCaller({
    session: userId
      ? {
          user: {
            id: userId,
            email: sessionEmail ?? `${userId}@example.com`,
            globalRoles: ['user'],
          },
          expires: new Date(Date.now() + 60_000).toISOString(),
        }
      : null,
    userId,
  });
}

test('spaces.list works for guest (public directory path)', async () => {
  const caller = createCaller(null);
  const result = await caller.list();
  assert.equal(result.spaces.length, 1);
  assert.equal(result.spaces[0].visibility, 'public');
});

test('spaces.create requires authentication', async () => {
  const caller = createCaller(null);

  await assert.rejects(
    () =>
      caller.create({
        name: 'Private Team',
        type: 'team',
        visibility: 'hidden',
        joinPolicy: 'invite_only',
        reviewPolicy: 'none',
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'UNAUTHORIZED',
  );
});

test('spaces.update maps access denial to FORBIDDEN', async () => {
  const caller = createCaller('user-1', {
    updateSpaceForUser: async () => {
      throw new AccessDeniedError();
    },
  });

  await assert.rejects(
    () =>
      caller.update({
        spaceId: 'space-x',
        data: { name: 'Changed' },
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'FORBIDDEN',
  );
});

test('spaces.joinRequests.review returns review payload', async () => {
  const caller = createCaller('user-1');
  const result = await caller.joinRequests.review({
    spaceId: 'space-1',
    data: {
      requestId: 'join-9',
      decision: 'approve',
    },
  });

  assert.equal(result.result.requestId, 'join-9');
  assert.equal(result.result.status, 'approved');
  assert.equal(result.result.memberGranted, true);
});

test('spaces.joinRequests.mine returns actor request states', async () => {
  const caller = createCaller('user-1');
  const result = await caller.joinRequests.mine();
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].status, 'pending');
});

test('spaces.joinRequests.list denies cross-space access', async () => {
  const caller = createCaller('user-2', {
    listSpaceJoinRequests: async () => {
      throw new AccessDeniedError();
    },
  });

  await assert.rejects(
    () =>
      caller.joinRequests.list({
        spaceId: 'space-other',
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'FORBIDDEN',
  );
});

test('spaces.invites.list denies cross-space access', async () => {
  const caller = createCaller('user-2', {
    listSpaceInvites: async () => {
      throw new AccessDeniedError();
    },
  });

  await assert.rejects(
    () =>
      caller.invites.list({
        spaceId: 'space-other',
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'FORBIDDEN',
  );
});

test('spaces.invites.accept forwards session email to service', async () => {
  let receivedEmail: string | null | undefined;

  const caller = createCaller(
    'user-9',
    {
      acceptSpaceInviteToken: async (_token, _userId, email) => {
        receivedEmail = email;
        return {
          spaceId: 'space-1',
          role: 'member',
          status: 'accepted',
        };
      },
    },
    'alex@example.com',
  );

  const result = await caller.invites.accept({ token: 'space-token' });
  assert.equal(receivedEmail, 'alex@example.com');
  assert.equal(result.invite.status, 'accepted');
});
