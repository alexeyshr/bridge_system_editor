import assert from 'node:assert/strict';
import test from 'node:test';
import { AccessDeniedError, RevisionConflictError } from '../../lib/server/systems-service';
import { createBiddingRouter } from '../../lib/trpc/routers/bidding';
import { TRPCError } from '@trpc/server';

function createDeps(overrides: Partial<Parameters<typeof createBiddingRouter>[0]> = {}) {
  return {
    listSystemsForUser: async () => [],
    createSystemForUser: async (_userId: string, input: { title: string; description?: string | null }) => ({
      id: 'sys-1',
      title: input.title,
      description: input.description ?? null,
      schemaVersion: 1,
      revision: 1,
      role: 'owner' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getSystemForUser: async (_systemId: string) => ({
      id: 'sys-1',
      title: 'Demo',
      description: null,
      schemaVersion: 1,
      revision: 1,
      role: 'owner' as const,
      updatedAt: new Date().toISOString(),
      nodes: [],
    }),
    updateSystemMetadata: async (_systemId: string, _userId: string, input: { title?: string; description?: string | null; schemaVersion?: number }) => ({
      id: 'sys-1',
      title: input.title ?? 'Demo',
      description: input.description ?? null,
      schemaVersion: input.schemaVersion ?? 1,
      revision: 1,
      updatedAt: new Date().toISOString(),
    }),
    upsertSystemNodes: async () => ({
      revision: 2,
      upserted: 1,
      removed: 0,
    }),
    listSystemShares: async () => [],
    upsertSystemShare: async () => ({
      id: 'share-1',
      role: 'viewer' as const,
      createdAt: new Date().toISOString(),
      user: {
        id: 'user-2',
        email: 'user2@example.com',
        displayName: 'User 2',
        telegramUsername: null,
      },
    }),
    listInvitesForSystem: async () => [],
    createInviteForSystem: async (_systemId: string, _ownerId: string, _input: { channel: 'email' | 'internal' | 'telegram'; role: 'viewer' | 'editor'; targetEmail?: string; targetUserId?: string; targetTelegramUsername?: string; expiresInHours: number }) => ({
      id: 'invite-1',
      channel: 'email' as const,
      role: 'viewer' as const,
      status: 'pending' as const,
      token: 'token',
      webInviteUrl: 'https://example.test/invite/token',
      telegramInviteUrl: null,
      expiresAt: new Date().toISOString(),
      delivery: {
        status: 'queued' as const,
        channel: 'email' as const,
        message: 'queued',
      },
    }),
    acceptInviteToken: async () => ({
      systemId: 'sys-1',
      role: 'viewer' as const,
      status: 'accepted' as const,
    }),
    searchUsers: async () => [],
    ...overrides,
  };
}

function createCaller(userId: string | null, overrides: Partial<Parameters<typeof createBiddingRouter>[0]> = {}) {
  const router = createBiddingRouter(createDeps(overrides));
  return router.createCaller({
    session: null,
    userId,
  });
}

test('bidding.systems.list returns payload for authenticated user', async () => {
  const caller = createCaller('user-1', {
    listSystemsForUser: async () => [
      {
        id: 'sys-1',
        title: 'Demo',
        description: null,
        schemaVersion: 1,
        revision: 1,
        updatedAt: new Date().toISOString(),
        role: 'owner' as const,
      },
    ],
  });

  const result = await caller.systems.list();
  assert.equal(result.systems.length, 1);
  assert.equal(result.systems[0].id, 'sys-1');
});

test('bidding.systems.get maps access denied to FORBIDDEN', async () => {
  const caller = createCaller('user-1', {
    getSystemForUser: async () => {
      throw new AccessDeniedError();
    },
  });

  await assert.rejects(
    () => caller.systems.get({ systemId: 'sys-1' }),
    (error: unknown) => error instanceof TRPCError && error.code === 'FORBIDDEN',
  );
});

test('bidding.nodes.sync maps revision conflict to CONFLICT', async () => {
  const caller = createCaller('user-1', {
    upsertSystemNodes: async () => {
      throw new RevisionConflictError();
    },
  });

  await assert.rejects(
    () =>
      caller.nodes.sync({
        systemId: 'sys-1',
        data: {
          nodes: [{ sequenceId: '1C', payload: { foo: 'bar' } }],
          baseRevision: 1,
        },
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'CONFLICT',
  );
});

test('bidding router blocks unauthenticated access', async () => {
  const caller = createCaller(null);
  await assert.rejects(
    () => caller.systems.list(),
    (error: unknown) => error instanceof TRPCError && error.code === 'UNAUTHORIZED',
  );
});
