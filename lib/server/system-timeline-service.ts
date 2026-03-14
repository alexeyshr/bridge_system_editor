import { db } from '@/lib/db/drizzle/client';
import { auditEvents, users } from '@/lib/db/drizzle/schema';
import { canRoleAccessCapability } from '@/lib/server/collaboration-policy';
import { AccessDeniedError, NotFoundError } from '@/lib/server/domain-errors';
import { drizzleSystemsDriver } from '@/lib/server/drivers/drizzle-systems-driver';
import { and, desc, eq, gte, like, lt, not, or } from 'drizzle-orm';

export type SystemTimelineCategory =
  | 'node'
  | 'lifecycle'
  | 'binding'
  | 'sharing'
  | 'discussion'
  | 'link'
  | 'system'
  | 'other';

export type SystemTimelineCursor = {
  createdAt: string;
  id: string;
};

export type SystemTimelineEvent = {
  id: string;
  action: string;
  category: SystemTimelineCategory;
  targetType: string;
  targetId: string | null;
  payload: unknown;
  createdAt: string;
  actor: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    telegramUsername: string | null;
    label: string;
    profileHref: string | null;
  };
};

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function getTimelineCategory(action: string): SystemTimelineCategory {
  if (action.startsWith('node.')) return 'node';
  if (action.startsWith('lifecycle.')) return 'lifecycle';
  if (action.startsWith('binding.')) return 'binding';
  if (action.startsWith('invite.') || action.startsWith('share.')) return 'sharing';
  if (action.startsWith('discussion.')) return 'discussion';
  if (action.startsWith('read_only_link.')) return 'link';
  if (action.startsWith('system.')) return 'system';
  return 'other';
}

function buildCategoryCondition(category: SystemTimelineCategory) {
  if (category === 'node') return like(auditEvents.action, 'node.%');
  if (category === 'lifecycle') return like(auditEvents.action, 'lifecycle.%');
  if (category === 'binding') return like(auditEvents.action, 'binding.%');
  if (category === 'sharing') {
    return or(
      like(auditEvents.action, 'invite.%'),
      like(auditEvents.action, 'share.%'),
    );
  }
  if (category === 'discussion') return like(auditEvents.action, 'discussion.%');
  if (category === 'link') return like(auditEvents.action, 'read_only_link.%');
  if (category === 'system') return like(auditEvents.action, 'system.%');

  return and(
    not(like(auditEvents.action, 'node.%')),
    not(like(auditEvents.action, 'lifecycle.%')),
    not(like(auditEvents.action, 'binding.%')),
    not(like(auditEvents.action, 'invite.%')),
    not(like(auditEvents.action, 'share.%')),
    not(like(auditEvents.action, 'discussion.%')),
    not(like(auditEvents.action, 'read_only_link.%')),
    not(like(auditEvents.action, 'system.%')),
  );
}

function buildTimelineActorLabel(input: {
  action: string;
  actorDisplayName: string | null;
  actorEmail: string | null;
  actorTelegramUsername: string | null;
  actorId: string | null;
}): string {
  if (input.actorDisplayName?.trim()) return input.actorDisplayName.trim();
  if (input.actorEmail?.trim()) return input.actorEmail.trim();
  if (input.actorTelegramUsername?.trim()) return `@${input.actorTelegramUsername.trim()}`;
  if (input.actorId) return `User ${input.actorId.slice(0, 8)}`;
  if (input.action === 'read_only_link.access') return 'Link visitor';
  return 'System';
}

function buildTimelineProfileHref(input: {
  actorId: string | null;
  actorTelegramUsername: string | null;
  currentUserId: string;
}): string | null {
  if (!input.actorId && !input.actorTelegramUsername) return null;
  if (input.actorId === input.currentUserId) return '/dashboard/settings';
  if (input.actorTelegramUsername?.trim()) return `https://t.me/${input.actorTelegramUsername.trim()}`;
  return null;
}

export async function listSystemTimeline(
  systemId: string,
  userId: string,
  input?: {
    limit?: number;
    windowDays?: number;
    categories?: SystemTimelineCategory[];
    cursor?: SystemTimelineCursor;
  },
): Promise<{
  events: SystemTimelineEvent[];
  pageInfo: {
    limit: number;
    windowDays: number;
    hasMore: boolean;
    nextCursor: SystemTimelineCursor | null;
  };
}> {
  const access = await drizzleSystemsDriver.resolveSystemAccess(systemId, userId);
  if (!access.systemExists) throw new NotFoundError('System not found');
  if (!canRoleAccessCapability(access.role, 'system.read')) throw new AccessDeniedError();

  const limit = Math.min(100, Math.max(1, input?.limit ?? 40));
  const windowDays = Math.min(365, Math.max(1, input?.windowDays ?? 90));
  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - windowDays);

  const categoryFilters = input?.categories?.length ? Array.from(new Set(input.categories)) : [];
  const categoryCondition = categoryFilters.length > 0
    ? or(...categoryFilters.map((category) => buildCategoryCondition(category)))
    : null;

  const cursorCreatedAt = input?.cursor ? new Date(input.cursor.createdAt) : null;
  const cursorCondition = cursorCreatedAt && !Number.isNaN(cursorCreatedAt.getTime()) && input?.cursor
    ? or(
      lt(auditEvents.createdAt, cursorCreatedAt),
      and(eq(auditEvents.createdAt, cursorCreatedAt), lt(auditEvents.id, input.cursor.id)),
    )
    : null;

  const rows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      targetType: auditEvents.targetType,
      targetId: auditEvents.targetId,
      payload: auditEvents.payload,
      createdAt: auditEvents.createdAt,
      actorId: users.id,
      actorDisplayName: users.displayName,
      actorEmail: users.email,
      actorTelegramUsername: users.telegramUsername,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .where(
      and(
        eq(auditEvents.systemId, systemId),
        gte(auditEvents.createdAt, sinceDate),
        categoryCondition ?? undefined,
        cursorCondition ?? undefined,
      ),
    )
    .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const visibleRows = hasMore ? rows.slice(0, limit) : rows;

  const events = visibleRows.map<SystemTimelineEvent>((row) => ({
    id: row.id,
    action: row.action,
    category: getTimelineCategory(row.action),
    targetType: row.targetType,
    targetId: row.targetId ?? null,
    payload: row.payload ?? null,
    createdAt: toIso(row.createdAt),
    actor: {
      id: row.actorId ?? null,
      displayName: row.actorDisplayName ?? null,
      email: row.actorEmail ?? null,
      telegramUsername: row.actorTelegramUsername ?? null,
      label: buildTimelineActorLabel({
        action: row.action,
        actorDisplayName: row.actorDisplayName ?? null,
        actorEmail: row.actorEmail ?? null,
        actorTelegramUsername: row.actorTelegramUsername ?? null,
        actorId: row.actorId ?? null,
      }),
      profileHref: buildTimelineProfileHref({
        actorId: row.actorId ?? null,
        actorTelegramUsername: row.actorTelegramUsername ?? null,
        currentUserId: userId,
      }),
    },
  }));

  const tail = events[events.length - 1];
  const nextCursor = hasMore && tail
    ? { createdAt: tail.createdAt, id: tail.id }
    : null;

  return {
    events,
    pageInfo: {
      limit,
      windowDays,
      hasMore,
      nextCursor,
    },
  };
}
