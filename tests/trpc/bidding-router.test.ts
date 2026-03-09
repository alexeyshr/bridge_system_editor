import assert from 'node:assert/strict';
import test from 'node:test';
import { clearRateLimitBuckets } from '../../lib/server/rate-limit';
import { AccessDeniedError, InvalidStateError, RevisionConflictError } from '../../lib/server/systems-service';
import { createBiddingRouter } from '../../lib/trpc/routers/bidding';
import { TRPCError } from '@trpc/server';

function createDeps(overrides: Partial<Parameters<typeof createBiddingRouter>[0]> = {}) {
  return {
    assertSystemCapability: async () => 'owner' as const,
    listSystemsForUser: async (_userId: string, _filters?: { query?: string; access?: 'all' | 'owner' | 'shared'; status?: 'all' | 'active' | 'stale'; tag?: string }) => [],
    createSystemForUser: async (
      _userId: string,
      input: { title: string; description?: string | null; templateId?: 'standard' | 'two_over_one' | 'precision' },
    ) => ({
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
    listSystemVersions: async () => [],
    publishSystemVersion: async (_systemId: string, _userId: string, input: { label?: string | null; notes?: string | null }) => ({
      id: 'ver-1',
      systemId: 'sys-1',
      versionNumber: 1,
      label: input.label ?? null,
      notes: input.notes ?? null,
      sourceRevision: 2,
      publishedAt: new Date().toISOString(),
    }),
    createDraftFromVersion: async (_systemId: string, _userId: string, versionId: string) => ({
      systemId: 'sys-1',
      versionId,
      versionNumber: 1,
      revision: 3,
      restoredNodes: 12,
    }),
    compareDraftWithVersion: async (_systemId: string, _userId: string, versionId: string) => ({
      systemId: 'sys-1',
      draftRevision: 3,
      versionId,
      versionNumber: 1,
      sourceRevision: 2,
      summary: {
        added: 1,
        removed: 0,
        changed: 2,
        unchanged: 5,
      },
      addedSequenceIds: ['1C-1D-1H'],
      removedSequenceIds: [],
      changedSequenceIds: ['1C-1D', '1C-1NT'],
    }),
    listTournamentBindings: async () => [],
    upsertTournamentBinding: async (_systemId: string, _userId: string, input: { tournamentId: string; scopeType: 'global' | 'pair' | 'team'; scopeId?: string; versionId: string }) => ({
      id: 'bind-1',
      tournamentId: input.tournamentId,
      scopeType: input.scopeType,
      scopeId: input.scopeId ?? '',
      status: 'active' as const,
      systemId: 'sys-1',
      versionId: input.versionId,
      versionNumber: 1,
      boundAt: new Date().toISOString(),
      frozenAt: null,
      updatedAt: new Date().toISOString(),
    }),
    freezeTournamentBinding: async (systemId: string, _userId: string, bindingId: string) => ({
      id: bindingId,
      status: 'frozen' as const,
      frozenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      systemId,
    }),
    removeTournamentBinding: async (_systemId: string, _userId: string, bindingId: string) => ({
      id: bindingId,
      removed: true as const,
    }),
    freezeTournamentBindings: async (_systemId: string, _userId: string, tournamentId: string) => ({
      tournamentId,
      frozenCount: 1,
      alreadyFrozenCount: 0,
    }),
    listInvitesForSystem: async () => [],
    createInviteForSystem: async (_systemId: string, _ownerId: string, _input: { channel: 'email' | 'internal' | 'telegram'; role: 'viewer' | 'reviewer' | 'editor'; targetEmail?: string; targetUserId?: string; targetTelegramUsername?: string; expiresInHours: number }) => ({
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
    revokeInviteForSystem: async (_systemId: string, _ownerId: string, inviteId: string) => ({
      id: inviteId,
      systemId: 'sys-1',
      status: 'revoked' as const,
      revokedAt: new Date().toISOString(),
    }),
    acceptInviteToken: async () => ({
      systemId: 'sys-1',
      role: 'viewer' as const,
      status: 'accepted' as const,
    }),
    listDiscussionThreads: async () => [],
    createDiscussionThread: async (_systemId: string, _userId: string, input: { scope: 'system' | 'node'; scopeNodeId?: string; title?: string | null; body: string }) => ({
      id: 'thread-1',
      systemId: 'sys-1',
      scope: input.scope,
      scopeNodeId: input.scope === 'node' ? (input.scopeNodeId ?? null) : null,
      title: input.title ?? null,
      isResolved: false,
      createdById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      firstMessageId: 'msg-1',
    }),
    listDiscussionMessages: async () => [],
    postDiscussionMessage: async (_systemId: string, _userId: string, input: { threadId: string; body: string }) => ({
      id: 'msg-1',
      threadId: input.threadId,
      systemId: 'sys-1',
      body: input.body,
      authorId: 'user-1',
      createdAt: new Date().toISOString(),
      editedAt: null,
    }),
    listReadOnlyLinks: async () => [],
    createReadOnlyLink: async (_systemId: string, _userId: string, _input: { versionId?: string; label?: string | null; expiresInHours?: number | null }) => ({
      id: 'plink-1',
      systemId: 'sys-1',
      versionId: 'ver-1',
      versionNumber: 1,
      label: null,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      revokedAt: null,
      lastAccessAt: null,
      url: 'https://example.test/api/publish-links/token',
    }),
    revokeReadOnlyLink: async (_systemId: string, _userId: string, linkId: string) => ({
      id: linkId,
      status: 'revoked' as const,
      revokedAt: new Date().toISOString(),
    }),
    rotateReadOnlyLink: async (_systemId: string, _userId: string, linkId: string) => ({
      id: linkId,
      status: 'active' as const,
      url: 'https://example.test/api/publish-links/new-token',
    }),
    getReadOnlyPublishedSnapshot: async () => ({
      link: {
        id: 'plink-1',
        systemId: 'sys-1',
        versionId: 'ver-1',
        label: null,
        accessedAt: new Date().toISOString(),
      },
      version: {
        id: 'ver-1',
        versionNumber: 1,
        label: 'v1',
        notes: null,
        sourceRevision: 2,
        publishedAt: new Date().toISOString(),
        snapshot: { system: { id: 'sys-1' }, nodes: [] },
      },
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

test('bidding.systems.list forwards filters to service dependency', async () => {
  let receivedFilters: { query?: string; access?: 'all' | 'owner' | 'shared'; status?: 'all' | 'active' | 'stale'; tag?: string } | undefined;

  const caller = createCaller('user-1', {
    listSystemsForUser: async (_userId, filters) => {
      receivedFilters = filters;
      return [];
    },
  });

  await caller.systems.list({
    query: 'precision',
    access: 'owner',
    status: 'active',
    tag: 'relay',
  });

  assert.deepEqual(receivedFilters, {
    query: 'precision',
    access: 'owner',
    status: 'active',
    tag: 'relay',
  });
});

test('bidding.systems.create forwards template payload to service dependency', async () => {
  let receivedInput:
    | { title: string; description?: string | null; templateId?: 'standard' | 'two_over_one' | 'precision' }
    | undefined;

  const caller = createCaller('user-1', {
    createSystemForUser: async (_userId, input) => {
      receivedInput = input;
      return {
        id: 'sys-1',
        title: input.title,
        description: input.description ?? null,
        schemaVersion: 1,
        revision: 1,
        role: 'owner' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  });

  await caller.systems.create({
    title: 'Precision System',
    description: 'Bootstrap profile',
    templateId: 'precision',
  });

  assert.deepEqual(receivedInput, {
    title: 'Precision System',
    description: 'Bootstrap profile',
    templateId: 'precision',
  });
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

test('bidding.lifecycle.publish returns published version payload', async () => {
  const caller = createCaller('user-1');
  const result = await caller.lifecycle.publish({
    systemId: 'sys-1',
    data: {
      label: 'v1',
      notes: 'Initial publish',
    },
  });

  assert.equal(result.version.systemId, 'sys-1');
  assert.equal(result.version.versionNumber, 1);
  assert.equal(result.version.label, 'v1');
});

test('bidding.lifecycle.compare returns comparison payload', async () => {
  const caller = createCaller('user-1');
  const result = await caller.lifecycle.compare({
    systemId: 'sys-1',
    data: {
      versionId: 'ver-1',
    },
  });

  assert.equal(result.comparison.versionId, 'ver-1');
  assert.equal(result.comparison.summary.changed, 2);
  assert.deepEqual(result.comparison.changedSequenceIds, ['1C-1D', '1C-1NT']);
});

test('bidding.bindings.freeze maps invalid state to CONFLICT', async () => {
  const caller = createCaller('user-1', {
    freezeTournamentBinding: async () => {
      throw new InvalidStateError('Binding is already frozen');
    },
  });

  await assert.rejects(
    () =>
      caller.bindings.freeze({
        systemId: 'sys-1',
        data: { bindingId: 'bind-1' },
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'CONFLICT',
  );
});

test('bidding.bindings.remove returns payload', async () => {
  const caller = createCaller('user-1');
  const result = await caller.bindings.remove({
    systemId: 'sys-1',
    data: { bindingId: 'bind-1' },
  });

  assert.equal(result.result.id, 'bind-1');
  assert.equal(result.result.removed, true);
});

test('bidding.bindings.freezeTournament returns aggregate payload', async () => {
  const caller = createCaller('user-1');
  const result = await caller.bindings.freezeTournament({
    systemId: 'sys-1',
    data: { tournamentId: 'tour-1' },
  });

  assert.equal(result.result.tournamentId, 'tour-1');
  assert.equal(result.result.frozenCount, 1);
});

test('bidding.shares.list checks shares.manage capability before service call', async () => {
  let guardCalled = false;
  let listCalled = false;

  const caller = createCaller('user-1', {
    assertSystemCapability: async (systemId, userId, capability) => {
      guardCalled = true;
      assert.equal(systemId, 'sys-1');
      assert.equal(userId, 'user-1');
      assert.equal(capability, 'shares.manage');
      return 'owner';
    },
    listSystemShares: async () => {
      listCalled = true;
      return [];
    },
  });

  const result = await caller.shares.list({ systemId: 'sys-1' });
  assert.equal(guardCalled, true);
  assert.equal(listCalled, true);
  assert.deepEqual(result.shares, []);
});

test('bidding.shares.upsert maps capability denial to FORBIDDEN', async () => {
  const caller = createCaller('user-1', {
    assertSystemCapability: async () => {
      throw new AccessDeniedError();
    },
  });

  await assert.rejects(
    () =>
      caller.shares.upsert({
        systemId: 'sys-1',
        data: { userId: 'user-2', role: 'reviewer' },
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'FORBIDDEN',
  );
});

test('bidding.invites.create checks invites.manage capability before service call', async () => {
  let guardCalled = false;

  const caller = createCaller('user-1', {
    assertSystemCapability: async (_systemId, _userId, capability) => {
      guardCalled = true;
      assert.equal(capability, 'invites.manage');
      return 'owner';
    },
    createInviteForSystem: async (_systemId, _ownerId, input) => ({
      id: 'invite-1',
      channel: input.channel,
      role: input.role,
      status: 'pending',
      token: 'token',
      webInviteUrl: 'https://example.test/invite/token',
      telegramInviteUrl: null,
      expiresAt: new Date().toISOString(),
      delivery: {
        status: 'queued',
        channel: input.channel,
        message: 'queued',
      },
    }),
  });

  const result = await caller.invites.create({
    systemId: 'sys-1',
    data: {
      channel: 'internal',
      role: 'reviewer',
      targetUserId: 'user-2',
      expiresInHours: 24,
    },
  });

  assert.equal(guardCalled, true);
  assert.equal(result.invite.role, 'reviewer');
});

test('bidding.invites.create maps rate limit to TOO_MANY_REQUESTS', async () => {
  clearRateLimitBuckets();
  let createCalls = 0;
  const caller = createCaller('user-1', {
    createInviteForSystem: async (_systemId, _ownerId, input) => {
      createCalls += 1;
      return {
        id: `invite-${createCalls}`,
        channel: input.channel,
        role: input.role,
        status: 'pending',
        token: 'token',
        webInviteUrl: 'https://example.test/invite/token',
        telegramInviteUrl: null,
        expiresAt: new Date().toISOString(),
        delivery: {
          status: 'queued',
          channel: input.channel,
          message: 'queued',
        },
      };
    },
  });

  const previousNow = Date.now;
  const nowValue = 1_700_000_000_000;
  Date.now = () => nowValue;
  try {
    for (let i = 0; i < 20; i += 1) {
      await caller.invites.create({
        systemId: 'sys-1',
        data: {
          channel: 'email',
          role: 'viewer',
          targetEmail: `user${i}@example.com`,
          expiresInHours: 24,
        },
      });
    }

    await assert.rejects(
      () =>
        caller.invites.create({
          systemId: 'sys-1',
          data: {
            channel: 'email',
            role: 'viewer',
            targetEmail: 'overflow@example.com',
            expiresInHours: 24,
          },
        }),
      (error: unknown) => error instanceof TRPCError && error.code === 'TOO_MANY_REQUESTS',
    );
    assert.equal(createCalls, 20);
  } finally {
    Date.now = previousNow;
  }
});

test('bidding.invites.revoke revokes pending invite', async () => {
  const caller = createCaller('user-1');
  const result = await caller.invites.revoke({
    systemId: 'sys-1',
    data: { inviteId: 'invite-1' },
  });

  assert.equal(result.invite.id, 'invite-1');
  assert.equal(result.invite.status, 'revoked');
});

test('bidding.users.search requires users.search capability and forwards query', async () => {
  let receivedQuery = '';

  const caller = createCaller('user-1', {
    assertSystemCapability: async (_systemId, _userId, capability) => {
      assert.equal(capability, 'users.search');
      return 'owner';
    },
    searchUsers: async (query) => {
      receivedQuery = query;
      return [
        {
          id: 'user-2',
          email: 'user-2@example.com',
          displayName: 'User 2',
          telegramUsername: null,
        },
      ];
    },
  });

  const result = await caller.users.search({ systemId: 'sys-1', q: 'alex' });
  assert.equal(receivedQuery, 'alex');
  assert.equal(result.users.length, 1);
  assert.equal(result.users[0]?.id, 'user-2');
});

test('bidding.discussions.createThread returns thread payload', async () => {
  const caller = createCaller('user-1');
  const result = await caller.discussions.createThread({
    systemId: 'sys-1',
    data: {
      scope: 'node',
      scopeNodeId: 'o:1C',
      title: 'After opening',
      body: 'Need agreement for [user:user-2]',
    },
  });

  assert.equal(result.thread.scope, 'node');
  assert.equal(result.thread.scopeNodeId, 'o:1C');
});

test('bidding.discussions does not route through node mutation path', async () => {
  let nodesSyncCalled = false;
  const caller = createCaller('user-1', {
    upsertSystemNodes: async () => {
      nodesSyncCalled = true;
      return {
        revision: 2,
        upserted: 0,
        removed: 0,
      };
    },
  });

  await caller.discussions.postMessage({
    systemId: 'sys-1',
    data: {
      threadId: 'thread-1',
      body: 'Discussion comment',
    },
  });

  assert.equal(nodesSyncCalled, false);
});

test('bidding.discussions.postMessage maps rate limit to TOO_MANY_REQUESTS', async () => {
  clearRateLimitBuckets();
  const caller = createCaller('user-1');
  const previousNow = Date.now;
  Date.now = () => 1_700_000_200_000;
  try {
    for (let i = 0; i < 40; i += 1) {
      await caller.discussions.postMessage({
        systemId: 'sys-1',
        data: {
          threadId: 'thread-1',
          body: `message ${i}`,
        },
      });
    }

    await assert.rejects(
      () =>
        caller.discussions.postMessage({
          systemId: 'sys-1',
          data: {
            threadId: 'thread-1',
            body: 'overflow',
          },
        }),
      (error: unknown) => error instanceof TRPCError && error.code === 'TOO_MANY_REQUESTS',
    );
  } finally {
    Date.now = previousNow;
  }
});

test('bidding.links lifecycle operations return payload', async () => {
  const caller = createCaller('user-1');

  const created = await caller.links.create({
    systemId: 'sys-1',
    data: {
      versionId: 'ver-1',
      label: 'Coaching',
    },
  });
  assert.equal(created.link.status, 'active');

  const rotated = await caller.links.rotate({
    systemId: 'sys-1',
    data: {
      linkId: created.link.id,
    },
  });
  assert.equal(rotated.link.status, 'active');

  const revoked = await caller.links.revoke({
    systemId: 'sys-1',
    data: {
      linkId: created.link.id,
    },
  });
  assert.equal(revoked.link.status, 'revoked');
});

test('bidding.links.access is available without auth', async () => {
  const caller = createCaller(null);
  const result = await caller.links.access({ token: 'public-token' });
  assert.equal(result.snapshot.link.id, 'plink-1');
});

test('bidding router blocks unauthenticated access', async () => {
  const caller = createCaller(null);
  await assert.rejects(
    () => caller.systems.list(),
    (error: unknown) => error instanceof TRPCError && error.code === 'UNAUTHORIZED',
  );
});
