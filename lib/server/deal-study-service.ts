import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle/client';
import {
  contentDealStudies,
  contentDealStudyComments,
  contentDealStudyDdSnapshots,
  contentDealStudyPlaySteps,
  contentDealStudyPollOptions,
  contentDealStudyPolls,
  contentDealStudyPollVotes,
  contentItems,
  spaceMembers,
  spaces,
  users,
  type ContentFormat,
  type ContentStatus,
  type ContentVisibility,
  type DealStudyDdSource,
  type DealStudyPollScope,
  type PortalGlobalRole,
  type SpaceJoinPolicy,
  type SpaceMemberRole,
  type SpaceVisibility,
} from '@/lib/db/drizzle/schema';
import { AccessDeniedError, InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';
import { canReadContent, canSpaceCapability, type SpaceAclResource } from '@/lib/server/space-acl';
import { createEntityId } from '@/lib/server/utils/id';
import type { DealStudyDraftInput, DealStudyPlayStepInput } from '@/lib/validation/deal-study';

type ContentActorInput = {
  userId: string | null;
  globalRoles?: PortalGlobalRole[];
};

type DealStudySeat = 'W' | 'N' | 'E' | 'S';
type DealStudySuit = 'S' | 'H' | 'D' | 'C';

type DealStudyHands = Record<DealStudySeat, Record<DealStudySuit, string>>;

type DealStudyMask = {
  hiddenSeats: DealStudySeat[];
  hiddenCards: Array<{ seat: DealStudySeat; suit: DealStudySuit; rank: string }>;
};

type ContentAccessRow = {
  id: string;
  spaceId: string;
  authorUserId: string;
  title: string;
  summary: string | null;
  format: ContentFormat;
  visibility: ContentVisibility;
  status: ContentStatus;
  blocks: unknown;
  publishedAt: Date | null;
  updatedAt: Date;
  spaceVisibility: SpaceVisibility;
  spaceJoinPolicy: SpaceJoinPolicy;
  spaceOwnerUserId: string;
  memberRole: SpaceMemberRole | null;
};

type DealStudyCommentView = {
  id: string;
  parentCommentId: string | null;
  body: string;
  anchor: { type: 'auction' | 'play' | 'general'; ref?: string } | null;
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

type DealStudyPollOptionView = {
  id: string;
  label: string;
  optionOrder: number;
  votes: number;
};

type DealStudyPollView = {
  id: string;
  scope: DealStudyPollScope;
  question: string;
  isClosed: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  options: DealStudyPollOptionView[];
  totalVotes: number;
  userVoteOptionId: string | null;
};

type DealStudyView = {
  contentId: string;
  board: string | null;
  dealer: DealStudySeat;
  vulnerability: 'none' | 'ns' | 'ew' | 'all';
  contractLevel: number | null;
  contractDenom: 'C' | 'D' | 'H' | 'S' | 'NT' | null;
  declarer: DealStudySeat | null;
  doubledState: 'none' | 'X' | 'XX';
  resultDelta: number | null;
  leadSuit: DealStudySuit | null;
  leadRank: string | null;
  hands: DealStudyHands;
  visibilityMask: DealStudyMask;
  auctionStartingSeat: DealStudySeat;
  auctionSequence: string[];
  auctionNotes: string | null;
  narrativeMarkdown: string;
  playSteps: DealStudyPlayStepInput[];
  ddSnapshot: {
    id: string;
    source: DealStudyDdSource;
    matrix: unknown;
    par: unknown;
    createdAt: string;
  } | null;
  comments: DealStudyCommentView[];
  polls: DealStudyPollView[];
  updatedAt: string | null;
};

export type DealStudyPayloadView = {
  content: {
    id: string;
    title: string;
    summary: string | null;
    format: ContentFormat;
    visibility: ContentVisibility;
    status: ContentStatus;
    publishedAt: string | null;
    updatedAt: string;
  };
  study: DealStudyView;
  capabilities: {
    canRead: boolean;
    canEdit: boolean;
    canComment: boolean;
    canVote: boolean;
    canCreatePoll: boolean;
    canPublish: boolean;
  };
};

const SEATS: DealStudySeat[] = ['W', 'N', 'E', 'S'];
const SUITS: DealStudySuit[] = ['S', 'H', 'D', 'C'];
const RANK_SET = new Set(['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']);

const DEFAULT_HANDS: DealStudyHands = {
  W: { S: '', H: '', D: '', C: '' },
  N: { S: '', H: '', D: '', C: '' },
  E: { S: '', H: '', D: '', C: '' },
  S: { S: '', H: '', D: '', C: '' },
};

const DEFAULT_MASK: DealStudyMask = {
  hiddenSeats: [],
  hiddenCards: [],
};

function encodeDoubledState(value: DealStudyView['doubledState']): string {
  if (value === 'none') return 'N'
  return value
}

function decodeDoubledState(value: string | null | undefined): DealStudyView['doubledState'] {
  const normalized = (value ?? '').toUpperCase()
  if (normalized === 'X' || normalized === 'XX') return normalized
  return 'none'
}

function resolveSubject(actor: ContentActorInput) {
  if (!actor.userId) {
    return { userId: null, globalRoles: [] as PortalGlobalRole[] };
  }
  return {
    userId: actor.userId,
    globalRoles: (actor.globalRoles?.length ? [...new Set(actor.globalRoles)] : ['user']) as PortalGlobalRole[],
  };
}

function toResource(row: {
  spaceVisibility: SpaceVisibility;
  spaceJoinPolicy: SpaceJoinPolicy;
  spaceOwnerUserId: string;
  memberRole: SpaceMemberRole | null;
}): SpaceAclResource {
  return {
    visibility: row.spaceVisibility,
    joinPolicy: row.spaceJoinPolicy,
    ownerUserId: row.spaceOwnerUserId,
    memberRole: row.memberRole,
  };
}

function canReadContentRow(actor: ReturnType<typeof resolveSubject>, row: ContentAccessRow): boolean {
  const resource = toResource(row);
  if (row.status !== 'published') {
    if (!actor.userId) return false;
    if (row.authorUserId === actor.userId) return true;
    return (
      canSpaceCapability(actor, resource, 'space.content.write')
      || canSpaceCapability(actor, resource, 'space.content.publish')
    );
  }
  return canReadContent(actor, resource, row.visibility);
}

function canEditContentRow(actor: ReturnType<typeof resolveSubject>, row: ContentAccessRow): boolean {
  if (!actor.userId) return false;
  if (row.status === 'archived') return false;
  return canSpaceCapability(actor, toResource(row), 'space.content.write');
}

async function getContentAccessRow(contentId: string, actorUserId: string | null): Promise<ContentAccessRow | null> {
  if (!actorUserId) {
    const [row] = await db
      .select({
        id: contentItems.id,
        spaceId: contentItems.spaceId,
        authorUserId: contentItems.authorUserId,
        title: contentItems.title,
        summary: contentItems.summary,
        format: contentItems.format,
        visibility: contentItems.visibility,
        status: contentItems.status,
        blocks: contentItems.blocks,
        publishedAt: contentItems.publishedAt,
        updatedAt: contentItems.updatedAt,
        spaceVisibility: spaces.visibility,
        spaceJoinPolicy: spaces.joinPolicy,
        spaceOwnerUserId: spaces.ownerUserId,
      })
      .from(contentItems)
      .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
      .where(eq(contentItems.id, contentId))
      .limit(1);
    if (!row) return null;
    return { ...row, memberRole: null };
  }

  const [row] = await db
    .select({
      id: contentItems.id,
      spaceId: contentItems.spaceId,
      authorUserId: contentItems.authorUserId,
      title: contentItems.title,
      summary: contentItems.summary,
      format: contentItems.format,
      visibility: contentItems.visibility,
      status: contentItems.status,
      blocks: contentItems.blocks,
      publishedAt: contentItems.publishedAt,
      updatedAt: contentItems.updatedAt,
      spaceVisibility: spaces.visibility,
      spaceJoinPolicy: spaces.joinPolicy,
      spaceOwnerUserId: spaces.ownerUserId,
      memberRole: spaceMembers.role,
    })
    .from(contentItems)
    .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
    .leftJoin(
      spaceMembers,
      and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, actorUserId)),
    )
    .where(eq(contentItems.id, contentId))
    .limit(1);

  return row ?? null;
}

function normalizeHands(input: unknown): DealStudyHands {
  const source = (input && typeof input === 'object' ? input : DEFAULT_HANDS) as Partial<DealStudyHands>;
  const next: DealStudyHands = {
    W: { S: '', H: '', D: '', C: '' },
    N: { S: '', H: '', D: '', C: '' },
    E: { S: '', H: '', D: '', C: '' },
    S: { S: '', H: '', D: '', C: '' },
  };

  for (const seat of SEATS) {
    const hand = source[seat] ?? { S: '', H: '', D: '', C: '' };
    next[seat] = {
      S: String(hand.S ?? '').toUpperCase(),
      H: String(hand.H ?? '').toUpperCase(),
      D: String(hand.D ?? '').toUpperCase(),
      C: String(hand.C ?? '').toUpperCase(),
    };
  }

  return next;
}

function normalizeMask(input: unknown): DealStudyMask {
  if (!input || typeof input !== 'object') return { ...DEFAULT_MASK };
  const source = input as DealStudyMask;
  return {
    hiddenSeats: (source.hiddenSeats ?? []).filter((seat): seat is DealStudySeat => SEATS.includes(seat as DealStudySeat)),
    hiddenCards: (source.hiddenCards ?? [])
      .map((item) => ({
        seat: item.seat,
        suit: item.suit,
        rank: String(item.rank ?? '').toUpperCase(),
      }))
      .filter((item): item is { seat: DealStudySeat; suit: DealStudySuit; rank: string } => (
        SEATS.includes(item.seat as DealStudySeat)
        && SUITS.includes(item.suit as DealStudySuit)
        && RANK_SET.has(item.rank)
      )),
  };
}

function validateHandsForDeckConflicts(hands: DealStudyHands): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];

  for (const seat of SEATS) {
    for (const suit of SUITS) {
      const cards = hands[seat][suit].replace(/[^AKQJT98765432Xx-]/g, '').toUpperCase();
      for (const rank of cards) {
        if (rank === '-' || rank === 'X') continue;
        const key = `${suit}${rank}`;
        if (seen.has(key)) {
          errors.push(`Duplicate card detected: ${key} appears more than once.`);
          continue;
        }
        seen.add(key);
      }
    }
  }

  if (seen.size > 52) {
    errors.push('Deck validation error: more than 52 unique cards.');
  }

  return errors;
}

function applyMaskToHands(
  hands: DealStudyHands,
  mask: DealStudyMask,
  bypassMask: boolean,
): DealStudyHands {
  if (bypassMask) return hands;

  const hiddenSeatSet = new Set(mask.hiddenSeats);
  const hiddenBySuit = new Map<string, Set<string>>();
  for (const item of mask.hiddenCards) {
    const key = `${item.seat}:${item.suit}`;
    const current = hiddenBySuit.get(key) ?? new Set<string>();
    current.add(item.rank.toUpperCase());
    hiddenBySuit.set(key, current);
  }

  const next = normalizeHands(hands);
  for (const seat of SEATS) {
    if (hiddenSeatSet.has(seat)) {
      next[seat] = { S: 'HIDDEN', H: 'HIDDEN', D: 'HIDDEN', C: 'HIDDEN' };
      continue;
    }

    for (const suit of SUITS) {
      const key = `${seat}:${suit}`;
      const blocked = hiddenBySuit.get(key);
      if (!blocked || blocked.size === 0) continue;
      const cards = next[seat][suit].toUpperCase().split('');
      next[seat][suit] = cards.map((card) => (blocked.has(card) ? '•' : card)).join('');
    }
  }

  return next;
}

function defaultDealStudy(contentId: string): DealStudyView {
  return {
    contentId,
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
    hands: normalizeHands(DEFAULT_HANDS),
    visibilityMask: normalizeMask(DEFAULT_MASK),
    auctionStartingSeat: 'W',
    auctionSequence: [],
    auctionNotes: null,
    narrativeMarkdown: '',
    playSteps: [],
    ddSnapshot: null,
    comments: [],
    polls: [],
    updatedAt: null,
  };
}

async function listPlaySteps(contentId: string): Promise<DealStudyPlayStepInput[]> {
  const rows = await db
    .select({
      trickNo: contentDealStudyPlaySteps.trickNo,
      leader: contentDealStudyPlaySteps.leader,
      cards: contentDealStudyPlaySteps.cards,
      winner: contentDealStudyPlaySteps.winner,
      note: contentDealStudyPlaySteps.note,
    })
    .from(contentDealStudyPlaySteps)
    .where(eq(contentDealStudyPlaySteps.contentItemId, contentId))
    .orderBy(asc(contentDealStudyPlaySteps.trickNo));

  return rows.map((row) => ({
    trickNo: row.trickNo,
    leader: row.leader as DealStudySeat,
    cards: Array.isArray(row.cards) ? row.cards as DealStudyPlayStepInput['cards'] : [],
    winner: (row.winner as DealStudySeat | null) ?? null,
    note: row.note ?? null,
  }));
}

async function getLatestDdSnapshot(contentId: string) {
  const [row] = await db
    .select({
      id: contentDealStudyDdSnapshots.id,
      source: contentDealStudyDdSnapshots.source,
      matrix: contentDealStudyDdSnapshots.matrix,
      par: contentDealStudyDdSnapshots.par,
      createdAt: contentDealStudyDdSnapshots.createdAt,
    })
    .from(contentDealStudyDdSnapshots)
    .where(eq(contentDealStudyDdSnapshots.contentItemId, contentId))
    .orderBy(desc(contentDealStudyDdSnapshots.createdAt))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    matrix: row.matrix,
    par: row.par,
    createdAt: row.createdAt.toISOString(),
  };
}

async function listComments(contentId: string): Promise<DealStudyCommentView[]> {
  const rows = await db
    .select({
      id: contentDealStudyComments.id,
      parentCommentId: contentDealStudyComments.parentCommentId,
      body: contentDealStudyComments.body,
      anchor: contentDealStudyComments.anchor,
      createdAt: contentDealStudyComments.createdAt,
      updatedAt: contentDealStudyComments.updatedAt,
      authorId: users.id,
      authorName: users.displayName,
      authorEmail: users.email,
    })
    .from(contentDealStudyComments)
    .innerJoin(users, eq(users.id, contentDealStudyComments.authorId))
    .where(eq(contentDealStudyComments.contentItemId, contentId))
    .orderBy(asc(contentDealStudyComments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    parentCommentId: row.parentCommentId,
    body: row.body,
    anchor: (row.anchor ?? null) as DealStudyCommentView['anchor'],
    author: {
      id: row.authorId,
      name: row.authorName ?? row.authorEmail ?? 'Unknown user',
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

async function listPolls(contentId: string, viewerUserId: string | null): Promise<DealStudyPollView[]> {
  const polls = await db
    .select({
      id: contentDealStudyPolls.id,
      scope: contentDealStudyPolls.scope,
      question: contentDealStudyPolls.question,
      isClosed: contentDealStudyPolls.isClosed,
      createdById: contentDealStudyPolls.createdById,
      createdAt: contentDealStudyPolls.createdAt,
      updatedAt: contentDealStudyPolls.updatedAt,
    })
    .from(contentDealStudyPolls)
    .where(eq(contentDealStudyPolls.contentItemId, contentId))
    .orderBy(desc(contentDealStudyPolls.createdAt));

  if (polls.length === 0) return [];

  const pollIds = polls.map((poll) => poll.id);
  const [options, votes, userVotes] = await Promise.all([
    db
      .select({
        id: contentDealStudyPollOptions.id,
        pollId: contentDealStudyPollOptions.pollId,
        optionOrder: contentDealStudyPollOptions.optionOrder,
        label: contentDealStudyPollOptions.label,
      })
      .from(contentDealStudyPollOptions)
      .where(inArray(contentDealStudyPollOptions.pollId, pollIds))
      .orderBy(asc(contentDealStudyPollOptions.optionOrder)),
    db
      .select({
        pollId: contentDealStudyPollVotes.pollId,
        optionId: contentDealStudyPollVotes.optionId,
      })
      .from(contentDealStudyPollVotes)
      .where(inArray(contentDealStudyPollVotes.pollId, pollIds)),
    viewerUserId
      ? db
          .select({
            pollId: contentDealStudyPollVotes.pollId,
            optionId: contentDealStudyPollVotes.optionId,
          })
          .from(contentDealStudyPollVotes)
          .where(and(
            inArray(contentDealStudyPollVotes.pollId, pollIds),
            eq(contentDealStudyPollVotes.userId, viewerUserId),
          ))
      : Promise.resolve([]),
  ]);

  const optionsByPoll = new Map<string, DealStudyPollOptionView[]>();
  for (const option of options) {
    const current = optionsByPoll.get(option.pollId) ?? [];
    current.push({
      id: option.id,
      label: option.label,
      optionOrder: option.optionOrder,
      votes: 0,
    });
    optionsByPoll.set(option.pollId, current);
  }

  const userVoteByPoll = new Map<string, string>();
  for (const row of userVotes) {
    userVoteByPoll.set(row.pollId, row.optionId);
  }

  for (const vote of votes) {
    const optionList = optionsByPoll.get(vote.pollId);
    if (!optionList) continue;
    const target = optionList.find((item) => item.id === vote.optionId);
    if (target) target.votes += 1;
  }

  return polls.map((poll) => {
    const pollOptions = optionsByPoll.get(poll.id) ?? [];
    const totalVotes = pollOptions.reduce((acc, current) => acc + current.votes, 0);
    return {
      id: poll.id,
      scope: poll.scope,
      question: poll.question,
      isClosed: poll.isClosed,
      createdById: poll.createdById,
      createdAt: poll.createdAt.toISOString(),
      updatedAt: poll.updatedAt.toISOString(),
      options: pollOptions,
      totalVotes,
      userVoteOptionId: userVoteByPoll.get(poll.id) ?? null,
    };
  });
}

export async function getDealStudy(contentId: string, actor: ContentActorInput): Promise<DealStudyPayloadView> {
  const row = await getContentAccessRow(contentId, actor.userId);
  if (!row) throw new NotFoundError('Content item not found');

  const subject = resolveSubject(actor);
  if (!canReadContentRow(subject, row)) {
    throw new AccessDeniedError();
  }

  const canEdit = canEditContentRow(subject, row);
  const canPublish = canSpaceCapability(subject, toResource(row), 'space.content.publish');
  const canComment = Boolean(actor.userId) && canReadContentRow(subject, row);
  const canVote = canComment;

  const [studyRow, playSteps, ddSnapshot, comments, polls] = await Promise.all([
    db
      .select({
        contentItemId: contentDealStudies.contentItemId,
        board: contentDealStudies.board,
        dealer: contentDealStudies.dealer,
        vulnerability: contentDealStudies.vulnerability,
        contractLevel: contentDealStudies.contractLevel,
        contractDenom: contentDealStudies.contractDenom,
        declarer: contentDealStudies.declarer,
        doubledState: contentDealStudies.doubledState,
        resultDelta: contentDealStudies.resultDelta,
        leadSuit: contentDealStudies.leadSuit,
        leadRank: contentDealStudies.leadRank,
        hands: contentDealStudies.hands,
        visibilityMask: contentDealStudies.visibilityMask,
        auctionStartingSeat: contentDealStudies.auctionStartingSeat,
        auctionSequence: contentDealStudies.auctionSequence,
        auctionNotes: contentDealStudies.auctionNotes,
        narrativeMarkdown: contentDealStudies.narrativeMarkdown,
        updatedAt: contentDealStudies.updatedAt,
      })
      .from(contentDealStudies)
      .where(eq(contentDealStudies.contentItemId, contentId))
      .limit(1),
    listPlaySteps(contentId),
    getLatestDdSnapshot(contentId),
    listComments(contentId),
    listPolls(contentId, actor.userId),
  ]);

  const defaultStudy = defaultDealStudy(contentId);
  const source = studyRow[0];
  const normalizedHands = source ? normalizeHands(source.hands) : defaultStudy.hands;
  const normalizedMask = source ? normalizeMask(source.visibilityMask) : defaultStudy.visibilityMask;

  const study: DealStudyView = {
    contentId,
    board: source?.board ?? defaultStudy.board,
    dealer: ((source?.dealer as DealStudySeat | null) ?? defaultStudy.dealer),
    vulnerability: ((source?.vulnerability as DealStudyView['vulnerability'] | null) ?? defaultStudy.vulnerability),
    contractLevel: source?.contractLevel ?? defaultStudy.contractLevel,
    contractDenom: (source?.contractDenom as DealStudyView['contractDenom'] | null) ?? defaultStudy.contractDenom,
    declarer: (source?.declarer as DealStudySeat | null) ?? defaultStudy.declarer,
    doubledState: decodeDoubledState(source?.doubledState),
    resultDelta: source?.resultDelta ?? defaultStudy.resultDelta,
    leadSuit: (source?.leadSuit as DealStudySuit | null) ?? defaultStudy.leadSuit,
    leadRank: source?.leadRank ?? defaultStudy.leadRank,
    hands: applyMaskToHands(normalizedHands, normalizedMask, canEdit),
    visibilityMask: normalizedMask,
    auctionStartingSeat: (source?.auctionStartingSeat as DealStudySeat | null) ?? defaultStudy.auctionStartingSeat,
    auctionSequence: Array.isArray(source?.auctionSequence) ? source?.auctionSequence.map((item) => String(item)) : [],
    auctionNotes: source?.auctionNotes ?? null,
    narrativeMarkdown: source?.narrativeMarkdown ?? '',
    playSteps,
    ddSnapshot,
    comments,
    polls,
    updatedAt: source?.updatedAt?.toISOString() ?? null,
  };

  return {
    content: {
      id: row.id,
      title: row.title,
      summary: row.summary,
      format: row.format,
      visibility: row.visibility,
      status: row.status,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    },
    study,
    capabilities: {
      canRead: true,
      canEdit,
      canComment,
      canVote,
      canCreatePoll: canEdit,
      canPublish,
    },
  };
}

export async function upsertDealStudyDraft(
  contentId: string,
  userId: string,
  input: DealStudyDraftInput,
  globalRoles?: PortalGlobalRole[],
): Promise<DealStudyPayloadView> {
  const row = await getContentAccessRow(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject({ userId, globalRoles });
  if (!canEditContentRow(subject, row)) {
    throw new AccessDeniedError();
  }
  if (row.format !== 'deal_analysis') {
    throw new InvalidStateError('Deal study editor is available only for deal_analysis content.');
  }

  const normalizedHands = normalizeHands(input.hands);
  const handValidationErrors = validateHandsForDeckConflicts(normalizedHands);
  if (handValidationErrors.length > 0) {
    throw new InvalidStateError(handValidationErrors[0] ?? 'Deal hand validation error.');
  }

  const now = new Date();
  await db
    .insert(contentDealStudies)
    .values({
      contentItemId: contentId,
      board: input.board ?? null,
      dealer: input.dealer,
      vulnerability: input.vulnerability,
      contractLevel: input.contractLevel ?? null,
      contractDenom: input.contractDenom ?? null,
      declarer: input.declarer ?? null,
      doubledState: encodeDoubledState(input.doubledState),
      resultDelta: input.resultDelta ?? null,
      leadSuit: input.leadSuit ?? null,
      leadRank: input.leadRank ?? null,
      hands: normalizedHands,
      visibilityMask: normalizeMask(input.visibilityMask),
      auctionStartingSeat: input.auctionStartingSeat,
      auctionSequence: input.auctionSequence,
      auctionNotes: input.auctionNotes ?? null,
      narrativeMarkdown: input.narrativeMarkdown ?? '',
      updatedAt: now,
      updatedById: userId,
    })
    .onConflictDoUpdate({
      target: contentDealStudies.contentItemId,
      set: {
        board: input.board ?? null,
        dealer: input.dealer,
        vulnerability: input.vulnerability,
        contractLevel: input.contractLevel ?? null,
        contractDenom: input.contractDenom ?? null,
        declarer: input.declarer ?? null,
        doubledState: encodeDoubledState(input.doubledState),
        resultDelta: input.resultDelta ?? null,
        leadSuit: input.leadSuit ?? null,
        leadRank: input.leadRank ?? null,
        hands: normalizedHands,
        visibilityMask: normalizeMask(input.visibilityMask),
        auctionStartingSeat: input.auctionStartingSeat,
        auctionSequence: input.auctionSequence,
        auctionNotes: input.auctionNotes ?? null,
        narrativeMarkdown: input.narrativeMarkdown ?? '',
        updatedAt: now,
        updatedById: userId,
      },
    });

  await db
    .update(contentItems)
    .set({
      updatedAt: now,
      updatedById: userId,
    })
    .where(eq(contentItems.id, contentId));

  return getDealStudy(contentId, { userId, globalRoles });
}

export async function upsertDealStudyPlaySteps(
  contentId: string,
  userId: string,
  steps: DealStudyPlayStepInput[],
  globalRoles?: PortalGlobalRole[],
): Promise<DealStudyPayloadView> {
  const row = await getContentAccessRow(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject({ userId, globalRoles });
  if (!canEditContentRow(subject, row)) throw new AccessDeniedError();

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .delete(contentDealStudyPlaySteps)
      .where(eq(contentDealStudyPlaySteps.contentItemId, contentId));

    if (steps.length > 0) {
      await tx.insert(contentDealStudyPlaySteps).values(
        steps.map((step) => ({
          id: createEntityId('cdsp'),
          contentItemId: contentId,
          trickNo: step.trickNo,
          leader: step.leader,
          cards: step.cards,
          winner: step.winner ?? null,
          note: step.note ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    await tx
      .update(contentItems)
      .set({
        updatedAt: now,
        updatedById: userId,
      })
      .where(eq(contentItems.id, contentId));
  });

  return getDealStudy(contentId, { userId, globalRoles });
}

export async function upsertDealStudyDdSnapshot(
  contentId: string,
  userId: string,
  input: {
    source: DealStudyDdSource;
    matrix: unknown;
    par: unknown;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<DealStudyPayloadView> {
  const row = await getContentAccessRow(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject({ userId, globalRoles });
  if (!canEditContentRow(subject, row)) throw new AccessDeniedError();

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(contentDealStudyDdSnapshots).values({
      id: createEntityId('cdds'),
      contentItemId: contentId,
      source: input.source,
      matrix: input.matrix,
      par: input.par,
      createdById: userId,
      createdAt: now,
    });

    await tx
      .update(contentItems)
      .set({
        updatedAt: now,
        updatedById: userId,
      })
      .where(eq(contentItems.id, contentId));
  });

  return getDealStudy(contentId, { userId, globalRoles });
}

export async function listDealStudyComments(
  contentId: string,
  actor: ContentActorInput,
): Promise<DealStudyCommentView[]> {
  const row = await getContentAccessRow(contentId, actor.userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject(actor);
  if (!canReadContentRow(subject, row)) throw new AccessDeniedError();
  return listComments(contentId);
}

export async function createDealStudyComment(
  contentId: string,
  userId: string,
  input: {
    parentCommentId?: string | null;
    body: string;
    anchor?: { type: 'auction' | 'play' | 'general'; ref?: string } | null;
  },
  globalRoles?: PortalGlobalRole[],
): Promise<DealStudyCommentView> {
  const row = await getContentAccessRow(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject({ userId, globalRoles });
  if (!canReadContentRow(subject, row)) throw new AccessDeniedError();

  if (input.parentCommentId) {
    const [parent] = await db
      .select({ id: contentDealStudyComments.id })
      .from(contentDealStudyComments)
      .where(and(
        eq(contentDealStudyComments.id, input.parentCommentId),
        eq(contentDealStudyComments.contentItemId, contentId),
      ))
      .limit(1);
    if (!parent) {
      throw new InvalidStateError('Parent comment not found in this study.');
    }
  }

  const now = new Date();
  const id = createEntityId('cdsc');
  await db.insert(contentDealStudyComments).values({
    id,
    contentItemId: contentId,
    parentCommentId: input.parentCommentId ?? null,
    authorId: userId,
    body: input.body,
    anchor: input.anchor ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const [created] = await db
    .select({
      id: contentDealStudyComments.id,
      parentCommentId: contentDealStudyComments.parentCommentId,
      body: contentDealStudyComments.body,
      anchor: contentDealStudyComments.anchor,
      createdAt: contentDealStudyComments.createdAt,
      updatedAt: contentDealStudyComments.updatedAt,
      authorId: users.id,
      authorName: users.displayName,
      authorEmail: users.email,
    })
    .from(contentDealStudyComments)
    .innerJoin(users, eq(users.id, contentDealStudyComments.authorId))
    .where(eq(contentDealStudyComments.id, id))
    .limit(1);

  if (!created) throw new NotFoundError('Created comment not found');

  return {
    id: created.id,
    parentCommentId: created.parentCommentId,
    body: created.body,
    anchor: (created.anchor ?? null) as DealStudyCommentView['anchor'],
    author: {
      id: created.authorId,
      name: created.authorName ?? created.authorEmail ?? 'Unknown user',
    },
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function createDealStudyPoll(
  contentId: string,
  userId: string,
  input: {
    scope: DealStudyPollScope;
    question: string;
    options: string[];
  },
  globalRoles?: PortalGlobalRole[],
): Promise<DealStudyPollView> {
  const row = await getContentAccessRow(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject({ userId, globalRoles });
  if (!canEditContentRow(subject, row)) throw new AccessDeniedError();

  const now = new Date();
  const pollId = createEntityId('cdspoll');
  await db.transaction(async (tx) => {
    await tx.insert(contentDealStudyPolls).values({
      id: pollId,
      contentItemId: contentId,
      scope: input.scope,
      question: input.question,
      isClosed: false,
      createdById: userId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(contentDealStudyPollOptions).values(
      input.options.map((option, index) => ({
        id: createEntityId('cdsopt'),
        pollId,
        optionOrder: index,
        label: option,
      })),
    );
  });

  const [poll] = await listPolls(contentId, userId);
  if (!poll) throw new NotFoundError('Poll not found after create');
  return poll;
}

export async function voteDealStudyPoll(
  contentId: string,
  userId: string,
  input: { pollId: string; optionId: string },
  globalRoles?: PortalGlobalRole[],
): Promise<DealStudyPollView> {
  const row = await getContentAccessRow(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject({ userId, globalRoles });
  if (!canReadContentRow(subject, row)) throw new AccessDeniedError();

  const [poll] = await db
    .select({
      id: contentDealStudyPolls.id,
      isClosed: contentDealStudyPolls.isClosed,
    })
    .from(contentDealStudyPolls)
    .where(and(
      eq(contentDealStudyPolls.id, input.pollId),
      eq(contentDealStudyPolls.contentItemId, contentId),
    ))
    .limit(1);
  if (!poll) throw new NotFoundError('Poll not found');
  if (poll.isClosed) throw new InvalidStateError('Poll is closed');

  const [option] = await db
    .select({ id: contentDealStudyPollOptions.id })
    .from(contentDealStudyPollOptions)
    .where(and(
      eq(contentDealStudyPollOptions.id, input.optionId),
      eq(contentDealStudyPollOptions.pollId, input.pollId),
    ))
    .limit(1);
  if (!option) throw new InvalidStateError('Option does not belong to this poll');

  await db
    .insert(contentDealStudyPollVotes)
    .values({
      id: createEntityId('cdsv'),
      pollId: input.pollId,
      optionId: input.optionId,
      userId,
    })
    .onConflictDoUpdate({
      target: [contentDealStudyPollVotes.pollId, contentDealStudyPollVotes.userId],
      set: {
        optionId: input.optionId,
      },
    });

  const polls = await listPolls(contentId, userId);
  const updated = polls.find((item) => item.id === input.pollId);
  if (!updated) throw new NotFoundError('Poll not found after vote');
  return updated;
}

export async function closeDealStudyPoll(
  contentId: string,
  userId: string,
  input: { pollId: string; isClosed: boolean },
  globalRoles?: PortalGlobalRole[],
): Promise<DealStudyPollView> {
  const row = await getContentAccessRow(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  const subject = resolveSubject({ userId, globalRoles });
  if (!canEditContentRow(subject, row)) throw new AccessDeniedError();

  await db
    .update(contentDealStudyPolls)
    .set({
      isClosed: input.isClosed,
      updatedAt: new Date(),
    })
    .where(and(
      eq(contentDealStudyPolls.id, input.pollId),
      eq(contentDealStudyPolls.contentItemId, contentId),
    ));

  const polls = await listPolls(contentId, userId);
  const updated = polls.find((item) => item.id === input.pollId);
  if (!updated) throw new NotFoundError('Poll not found after update');
  return updated;
}

export const __dealStudyTestUtils = {
  normalizeHands,
  normalizeMask,
  applyMaskToHands,
  validateHandsForDeckConflicts,
};
