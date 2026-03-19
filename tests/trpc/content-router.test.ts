import assert from 'node:assert/strict';
import test from 'node:test';
import { TRPCError } from '@trpc/server';

import { AccessDeniedError, InvalidStateError } from '../../lib/server/domain-errors';
import type { ContentItemView } from '../../lib/server/content-service';
import { createContentRouter, type ContentRouterDeps } from '../../lib/trpc/routers/content';

function createDeps(overrides: Partial<ContentRouterDeps> = {}): ContentRouterDeps {
  const baseItem: ContentItemView = {
    id: 'cnt-1',
    spaceId: 'space-1',
    authorUserId: 'user-1',
    authorDisplayName: 'Test User',
    title: 'Bridge psychology',
    summary: 'How partnership trust impacts decisions.',
    coverImageUrl: null,
    format: 'article' as const,
    visibility: 'public' as const,
    status: 'published' as const,
    blocks: [{ type: 'text', markdown: 'Body' }],
    tags: ['psychology'],
    links: [],
    lastVersionNumber: 1,
    publishedAt: new Date().toISOString(),
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseDeps: ContentRouterDeps = {
    listContentItemsForActor: async () => [baseItem],
    listContentFeedForActor: async () => [baseItem],
    getContentItem: async () => baseItem,
    createContentItem: async () => ({
      ...baseItem,
      id: 'cnt-2',
      status: 'draft',
      visibility: 'members_only',
      publishedAt: null,
      lastVersionNumber: 0,
    }),
    updateContentDraft: async () => ({
      ...baseItem,
      status: 'draft',
      visibility: 'members_only',
      publishedAt: null,
    }),
    publishContentItem: async () => ({
      item: baseItem,
      version: {
        id: 'cver-1',
        contentItemId: baseItem.id,
        versionNumber: 1,
        status: 'published',
        createdAt: new Date().toISOString(),
      },
    }),
    archiveContentItem: async () => ({
      ...baseItem,
      status: 'archived',
      archivedAt: new Date().toISOString(),
    }),
    unarchiveContentItem: async () => ({
      ...baseItem,
      status: 'draft',
      archivedAt: null,
    }),
    hardDeleteContentItem: async () => ({ deleted: true as const }),
    getDealStudy: async () => ({
      content: {
        id: baseItem.id,
        title: baseItem.title,
        summary: baseItem.summary,
        format: 'deal_analysis',
        visibility: 'public',
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      },
      study: {
        contentId: baseItem.id,
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
        visibilityMask: {
          hiddenSeats: [],
          hiddenCards: [],
        },
        auctionStartingSeat: 'W',
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
    }),
    upsertDealStudyDraft: async () => ({
      content: {
        id: baseItem.id,
        title: baseItem.title,
        summary: baseItem.summary,
        format: 'deal_analysis',
        visibility: 'public',
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      },
      study: {
        contentId: baseItem.id,
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
        visibilityMask: {
          hiddenSeats: [],
          hiddenCards: [],
        },
        auctionStartingSeat: 'W',
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
    }),
    upsertDealStudyPlaySteps: async () => ({
      content: {
        id: baseItem.id,
        title: baseItem.title,
        summary: baseItem.summary,
        format: 'deal_analysis',
        visibility: 'public',
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      },
      study: {
        contentId: baseItem.id,
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
        visibilityMask: {
          hiddenSeats: [],
          hiddenCards: [],
        },
        auctionStartingSeat: 'W',
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
    }),
    upsertDealStudyDdSnapshot: async () => ({
      content: {
        id: baseItem.id,
        title: baseItem.title,
        summary: baseItem.summary,
        format: 'deal_analysis',
        visibility: 'public',
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      },
      study: {
        contentId: baseItem.id,
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
        visibilityMask: {
          hiddenSeats: [],
          hiddenCards: [],
        },
        auctionStartingSeat: 'W',
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
    }),
    listDealStudyComments: async () => [],
    createDealStudyComment: async () => ({
      id: 'cdsc-1',
      parentCommentId: null,
      body: 'Nice analysis',
      anchor: { type: 'general' as const },
      author: { id: 'user-1', name: 'Alexey' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    createDealStudyPoll: async () => ({
      id: 'poll-1',
      scope: 'general',
      question: 'Best line?',
      isClosed: false,
      createdById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [],
      totalVotes: 0,
      userVoteOptionId: null,
    }),
    voteDealStudyPoll: async () => ({
      id: 'poll-1',
      scope: 'general',
      question: 'Best line?',
      isClosed: false,
      createdById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [],
      totalVotes: 1,
      userVoteOptionId: 'opt-1',
    }),
    closeDealStudyPoll: async () => ({
      id: 'poll-1',
      scope: 'general',
      question: 'Best line?',
      isClosed: true,
      createdById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [],
      totalVotes: 1,
      userVoteOptionId: null,
    }),
  };

  return {
    ...baseDeps,
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

test('content.list returns payload for guest actor', async () => {
  const caller = createCaller(null);
  const result = await caller.list();
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'cnt-1');
});

test('content.create requires authentication', async () => {
  const caller = createCaller(null);

  await assert.rejects(
    () =>
      caller.create({
        spaceId: 'space-1',
        title: 'Draft',
        format: 'article',
        visibility: 'members_only',
        blocks: [{ type: 'text', markdown: 'Body' }],
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'UNAUTHORIZED',
  );
});

test('content.publish maps invalid state to CONFLICT', async () => {
  const caller = createCaller('user-1', {
    publishContentItem: async () => {
      throw new InvalidStateError('Hidden spaces cannot publish public content');
    },
  });

  await assert.rejects(
    () =>
      caller.publish({
        contentId: 'cnt-1',
      }),
    (error: unknown) => error instanceof TRPCError && error.code === 'CONFLICT',
  );
});

test('content.get maps access denied to FORBIDDEN', async () => {
  const caller = createCaller('user-2', {
    getContentItem: async () => {
      throw new AccessDeniedError();
    },
  });

  await assert.rejects(
    () => caller.get({ contentId: 'cnt-1' }),
    (error: unknown) => error instanceof TRPCError && error.code === 'FORBIDDEN',
  );
});
