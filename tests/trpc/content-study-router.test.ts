import assert from 'node:assert/strict';
import test from 'node:test';
import { TRPCError } from '@trpc/server';

import { AccessDeniedError } from '../../lib/server/domain-errors';
import { createContentRouter, type ContentRouterDeps } from '../../lib/trpc/routers/content';

function buildPayload() {
  return {
    content: {
      id: 'cnt-study-1',
      title: 'Deal study',
      summary: null,
      format: 'deal_analysis' as const,
      visibility: 'public' as const,
      status: 'draft' as const,
      publishedAt: null,
      updatedAt: new Date().toISOString(),
    },
    study: {
      contentId: 'cnt-study-1',
      board: null,
      dealer: 'N' as const,
      vulnerability: 'none' as const,
      contractLevel: null,
      contractDenom: null,
      declarer: null,
      doubledState: 'none' as const,
      resultDelta: null,
      leadSuit: null,
      leadRank: null,
      hands: {
        W: { S: '', H: '', D: '', C: '' },
        N: { S: '', H: '', D: '', C: '' },
        E: { S: '', H: '', D: '', C: '' },
        S: { S: '', H: '', D: '', C: '' },
      },
      visibilityMask: {
        hiddenSeats: [],
        hiddenCards: [],
      },
      auctionStartingSeat: 'W' as const,
      auctionSequence: [],
      auctionNotes: null,
      narrativeMarkdown: '',
      playSteps: [],
      ddSnapshot: null,
      comments: [],
      polls: [],
      updatedAt: new Date().toISOString(),
    },
    capabilities: {
      canRead: true,
      canEdit: true,
      canComment: true,
      canVote: true,
      canCreatePoll: true,
      canPublish: true,
    },
  };
}

function createDeps(overrides: Partial<ContentRouterDeps> = {}): ContentRouterDeps {
  const payload = buildPayload();
  return {
    listContentItemsForActor: async () => [],
    listContentFeedForActor: async () => [],
    getContentItem: async () => {
      throw new Error('not used');
    },
    createContentItem: async () => {
      throw new Error('not used');
    },
    updateContentDraft: async () => {
      throw new Error('not used');
    },
    publishContentItem: async () => {
      throw new Error('not used');
    },
    archiveContentItem: async () => {
      throw new Error('not used');
    },
    getDealStudy: async () => payload,
    upsertDealStudyDraft: async () => payload,
    upsertDealStudyPlaySteps: async () => payload,
    upsertDealStudyDdSnapshot: async () => payload,
    listDealStudyComments: async () => [],
    createDealStudyComment: async () => ({
      id: 'c1',
      parentCommentId: null,
      body: 'Comment',
      anchor: { type: 'general' as const },
      author: { id: 'user-1', name: 'Alexey' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    createDealStudyPoll: async () => ({
      id: 'p1',
      scope: 'general' as const,
      question: 'Best call?',
      isClosed: false,
      createdById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [],
      totalVotes: 0,
      userVoteOptionId: null,
    }),
    voteDealStudyPoll: async () => ({
      id: 'p1',
      scope: 'general' as const,
      question: 'Best call?',
      isClosed: false,
      createdById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [],
      totalVotes: 1,
      userVoteOptionId: 'o1',
    }),
    closeDealStudyPoll: async () => ({
      id: 'p1',
      scope: 'general' as const,
      question: 'Best call?',
      isClosed: true,
      createdById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [],
      totalVotes: 1,
      userVoteOptionId: null,
    }),
    ...overrides,
  };
}

function createCaller(userId: string | null, overrides: Partial<ContentRouterDeps> = {}) {
  const router = createContentRouter(createDeps(overrides));
  return router.createCaller({
    session: userId
      ? {
          user: {
            id: userId,
            email: `${userId}@example.test`,
            globalRoles: ['user'],
          },
          expires: new Date(Date.now() + 60_000).toISOString(),
        }
      : null,
    userId,
  });
}

test('content.study.get returns payload for public reader', async () => {
  const caller = createCaller(null);
  const result = await caller.study.get({ contentId: 'cnt-study-1' });
  assert.equal(result.content.id, 'cnt-study-1');
  assert.equal(result.study.dealer, 'N');
});

test('content.study.upsertDraft requires authentication', async () => {
  const caller = createCaller(null);
  await assert.rejects(
    () =>
      caller.study.upsertDraft({
        contentId: 'cnt-study-1',
        data: {
          board: null,
          dealer: 'N',
          vulnerability: 'none',
          contractLevel: null,
          contractDenom: null,
          declarer: null,
          doubledState: 'none',
          resultDelta: null,
          leadSuit: null,
          leadRank: null,
          hands: {
            W: { S: '', H: '', D: '', C: '' },
            N: { S: '', H: '', D: '', C: '' },
            E: { S: '', H: '', D: '', C: '' },
            S: { S: '', H: '', D: '', C: '' },
          },
          visibilityMask: { hiddenSeats: [], hiddenCards: [] },
          auctionStartingSeat: 'W',
          auctionSequence: [],
          auctionNotes: null,
          narrativeMarkdown: '',
        },
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'UNAUTHORIZED',
  );
});

test('content.study.get maps access denied to FORBIDDEN', async () => {
  const caller = createCaller('user-2', {
    getDealStudy: async () => {
      throw new AccessDeniedError();
    },
  });

  await assert.rejects(
    () => caller.study.get({ contentId: 'cnt-study-1' }),
    (error: unknown) => error instanceof TRPCError && error.code === 'FORBIDDEN',
  );
});

