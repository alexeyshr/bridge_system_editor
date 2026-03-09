import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle/client';
import {
  discussionMentions,
  discussionMessages,
  discussionThreads,
  notificationEvents,
  users,
  type DiscussionScope,
} from '@/lib/db/drizzle/schema';
import { createEntityId } from '@/lib/server/utils/id';
import { InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';
import { assertSystemCapability } from '@/lib/server/systems-service';
import { recordAuditEvent } from '@/lib/server/audit-service';

const USER_ID_MENTION_REGEX = /\[user:([a-zA-Z0-9_-]{3,191})\]/g;
const USERNAME_MENTION_REGEX = /@([a-zA-Z0-9_]{2,64})/g;

type MentionCandidate = {
  token: string;
  userId?: string;
  username?: string;
};

type ThreadScopeInput = {
  scope: DiscussionScope;
  scopeNodeId?: string | null;
};

function parseMentionCandidates(body: string): MentionCandidate[] {
  const candidates: MentionCandidate[] = [];
  for (const match of body.matchAll(USER_ID_MENTION_REGEX)) {
    if (!match[1]) continue;
    candidates.push({
      token: match[0],
      userId: match[1],
    });
  }
  for (const match of body.matchAll(USERNAME_MENTION_REGEX)) {
    if (!match[1]) continue;
    candidates.push({
      token: match[0],
      username: match[1].toLowerCase(),
    });
  }
  return candidates;
}

async function resolveMentionedUsers(candidates: MentionCandidate[]): Promise<Array<{ userId: string; token: string }>> {
  if (candidates.length === 0) return [];
  const byId = Array.from(new Set(candidates.map((c) => c.userId).filter((item): item is string => !!item)));
  const byUsername = Array.from(
    new Set(candidates.map((c) => c.username).filter((item): item is string => !!item)),
  );

  const [idRows, usernameRows] = await Promise.all([
    byId.length > 0
      ? db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, byId))
      : Promise.resolve([]),
    byUsername.length > 0
      ? db
          .select({ id: users.id, telegramUsername: users.telegramUsername })
          .from(users)
          .where(inArray(users.telegramUsername, byUsername))
      : Promise.resolve([]),
  ]);

  const byIdMap = new Map<string, string>();
  idRows.forEach((row) => byIdMap.set(row.id, row.id));
  const byUsernameMap = new Map<string, string>();
  usernameRows.forEach((row) => {
    if (!row.telegramUsername) return;
    byUsernameMap.set(row.telegramUsername.toLowerCase(), row.id);
  });

  const resolved: Array<{ userId: string; token: string }> = [];
  for (const candidate of candidates) {
    if (candidate.userId && byIdMap.has(candidate.userId)) {
      resolved.push({ userId: candidate.userId, token: candidate.token });
      continue;
    }
    if (candidate.username) {
      const id = byUsernameMap.get(candidate.username);
      if (id) {
        resolved.push({ userId: id, token: candidate.token });
      }
    }
  }
  return resolved;
}

function normalizeScope(input: ThreadScopeInput): { scope: DiscussionScope; scopeNodeId: string | null } {
  if (input.scope === 'system') {
    return { scope: 'system', scopeNodeId: null };
  }
  if (!input.scopeNodeId?.trim()) {
    throw new InvalidStateError('scopeNodeId is required for node discussion scope');
  }
  return { scope: 'node', scopeNodeId: input.scopeNodeId.trim() };
}

export function extractMentionCandidates(body: string): MentionCandidate[] {
  return parseMentionCandidates(body);
}

export async function listDiscussionThreads(
  systemId: string,
  userId: string,
  input?: { scope?: DiscussionScope; scopeNodeId?: string },
) {
  await assertSystemCapability(systemId, userId, 'discussions.read');

  const filters = [eq(discussionThreads.systemId, systemId)];
  if (input?.scope) {
    filters.push(eq(discussionThreads.scope, input.scope));
  }
  if (input?.scopeNodeId) {
    filters.push(eq(discussionThreads.scopeNodeId, input.scopeNodeId));
  }

  const rows = await db
    .select({
      id: discussionThreads.id,
      scope: discussionThreads.scope,
      scopeNodeId: discussionThreads.scopeNodeId,
      title: discussionThreads.title,
      isResolved: discussionThreads.isResolved,
      createdById: discussionThreads.createdById,
      createdAt: discussionThreads.createdAt,
      updatedAt: discussionThreads.updatedAt,
    })
    .from(discussionThreads)
    .where(and(...filters))
    .orderBy(asc(discussionThreads.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createDiscussionThread(
  systemId: string,
  userId: string,
  input: { scope: DiscussionScope; scopeNodeId?: string; title?: string | null; body: string },
) {
  await assertSystemCapability(systemId, userId, 'discussions.write');
  const scope = normalizeScope({ scope: input.scope, scopeNodeId: input.scopeNodeId });
  const body = input.body.trim();
  if (!body) {
    throw new InvalidStateError('Message body is required');
  }

  const now = new Date();
  const threadId = createEntityId('thread');
  const messageId = createEntityId('msg');

  await db.transaction(async (tx) => {
    await tx.insert(discussionThreads).values({
      id: threadId,
      systemId,
      scope: scope.scope,
      scopeNodeId: scope.scopeNodeId,
      title: input.title?.trim() || null,
      isResolved: false,
      createdById: userId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(discussionMessages).values({
      id: messageId,
      threadId,
      systemId,
      body,
      authorId: userId,
      createdAt: now,
      editedAt: null,
    });
  });

  await dispatchMentions(systemId, threadId, messageId, userId, body);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'discussion.thread.create',
    targetType: 'discussion_thread',
    targetId: threadId,
    payload: {
      scope: scope.scope,
      scopeNodeId: scope.scopeNodeId,
    },
  });

  return {
    id: threadId,
    systemId,
    scope: scope.scope,
    scopeNodeId: scope.scopeNodeId,
    title: input.title?.trim() || null,
    isResolved: false,
    createdById: userId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    firstMessageId: messageId,
  };
}

export async function listDiscussionMessages(systemId: string, userId: string, threadId: string) {
  await assertSystemCapability(systemId, userId, 'discussions.read');

  const [thread] = await db
    .select({
      id: discussionThreads.id,
    })
    .from(discussionThreads)
    .where(and(eq(discussionThreads.id, threadId), eq(discussionThreads.systemId, systemId)))
    .limit(1);
  if (!thread) throw new NotFoundError('Discussion thread not found');

  const rows = await db
    .select({
      id: discussionMessages.id,
      body: discussionMessages.body,
      authorId: discussionMessages.authorId,
      createdAt: discussionMessages.createdAt,
      editedAt: discussionMessages.editedAt,
    })
    .from(discussionMessages)
    .where(and(eq(discussionMessages.systemId, systemId), eq(discussionMessages.threadId, threadId)))
    .orderBy(asc(discussionMessages.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
  }));
}

export async function postDiscussionMessage(
  systemId: string,
  userId: string,
  input: { threadId: string; body: string },
) {
  await assertSystemCapability(systemId, userId, 'discussions.write');
  const body = input.body.trim();
  if (!body) {
    throw new InvalidStateError('Message body is required');
  }

  const [thread] = await db
    .select({
      id: discussionThreads.id,
    })
    .from(discussionThreads)
    .where(and(eq(discussionThreads.id, input.threadId), eq(discussionThreads.systemId, systemId)))
    .limit(1);
  if (!thread) throw new NotFoundError('Discussion thread not found');

  const now = new Date();
  const messageId = createEntityId('msg');
  await db.transaction(async (tx) => {
    await tx.insert(discussionMessages).values({
      id: messageId,
      threadId: input.threadId,
      systemId,
      body,
      authorId: userId,
      createdAt: now,
      editedAt: null,
    });
    await tx
      .update(discussionThreads)
      .set({
        updatedAt: now,
      })
      .where(eq(discussionThreads.id, input.threadId));
  });

  await dispatchMentions(systemId, input.threadId, messageId, userId, body);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'discussion.message.create',
    targetType: 'discussion_message',
    targetId: messageId,
    payload: {
      threadId: input.threadId,
    },
  });

  return {
    id: messageId,
    threadId: input.threadId,
    systemId,
    body,
    authorId: userId,
    createdAt: now.toISOString(),
    editedAt: null,
  };
}

async function dispatchMentions(
  systemId: string,
  threadId: string,
  messageId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const candidates = parseMentionCandidates(body);
  const resolvedMentions = await resolveMentionedUsers(candidates);
  const uniqueMentions = Array.from(
    new Map(
      resolvedMentions
        .filter((mention) => mention.userId !== authorId)
        .map((mention) => [mention.userId, mention]),
    ).values(),
  );

  if (uniqueMentions.length === 0) return;

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(discussionMentions).values(
      uniqueMentions.map((mention) => ({
        id: createEntityId('mention'),
        systemId,
        threadId,
        messageId,
        mentionedUserId: mention.userId,
        mentionToken: mention.token,
        createdAt: now,
      })),
    );

    await tx.insert(notificationEvents).values(
      uniqueMentions.map((mention) => ({
        id: createEntityId('notif'),
        userId: mention.userId,
        systemId,
        type: 'mention' as const,
        payload: {
          threadId,
          messageId,
          mentionToken: mention.token,
        },
        readAt: null,
        createdAt: now,
      })),
    );
  });

  await recordAuditEvent({
    systemId,
    actorUserId: authorId,
    action: 'discussion.mentions.dispatch',
    targetType: 'discussion_message',
    targetId: messageId,
    payload: {
      threadId,
      recipients: uniqueMentions.map((item) => item.userId),
    },
  });
}
