import { and, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle/client';
import {
  contentItems,
  contentLinks,
  contentTags,
  contentVersions,
  spaceMembers,
  spaces,
  users,
  type ContentFormat,
  type ContentLinkTarget,
  type ContentStatus,
  type ContentVisibility,
  type PortalGlobalRole,
} from '@/lib/db/drizzle/schema';
import { canReadContent, canSpaceCapability, type SpaceAclResource } from '@/lib/server/space-acl';
import { AccessDeniedError, InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';
import { createEntityId } from '@/lib/server/utils/id';
import type { ContentBlock, ContentLinkInput } from '@/lib/validation/content';

type ContentActorInput = {
  userId: string | null;
  globalRoles?: PortalGlobalRole[];
};

type SpaceRow = {
  id: string;
  visibility: typeof spaces.$inferSelect.visibility;
  joinPolicy: typeof spaces.$inferSelect.joinPolicy;
  ownerUserId: string;
  memberRole: typeof spaceMembers.$inferSelect.role | null;
};

type ContentRow = {
  id: string;
  spaceId: string;
  authorUserId: string;
  authorDisplayName: string | null;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  format: ContentFormat;
  visibility: ContentVisibility;
  status: ContentStatus;
  blocks: unknown;
  publishedAt: Date | null;
  archivedAt: Date | null;
  lastVersionNumber: number;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string;
  spaceVisibility: typeof spaces.$inferSelect.visibility;
  spaceJoinPolicy: typeof spaces.$inferSelect.joinPolicy;
  spaceOwnerUserId: string;
  memberRole: typeof spaceMembers.$inferSelect.role | null;
};

export type ContentLinkView = {
  id: string;
  targetType: ContentLinkTarget;
  targetId: string | null;
  url: string | null;
  label: string | null;
};

export type ContentItemView = {
  id: string;
  spaceId: string;
  authorUserId: string;
  authorDisplayName: string | null;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  format: ContentFormat;
  visibility: ContentVisibility;
  status: ContentStatus;
  blocks: ContentBlock[];
  tags: string[];
  links: ContentLinkView[];
  lastVersionNumber: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentVersionView = {
  id: string;
  contentItemId: string;
  versionNumber: number;
  status: ContentStatus;
  createdAt: string;
};

export function assertContentPublishVisibilityPolicy(
  spaceVisibility: typeof spaces.$inferSelect.visibility,
  contentVisibility: ContentVisibility,
): void {
  if (spaceVisibility === 'hidden' && contentVisibility === 'public') {
    throw new InvalidStateError('Hidden spaces cannot publish public content');
  }
}

function toIso(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString();
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(normalized)];
}

function normalizeLinks(links: ContentLinkInput[] | undefined): Array<{
  targetType: ContentLinkTarget;
  targetId: string | null;
  url: string | null;
  label: string | null;
}> {
  if (!links) return [];
  return links.map((link) => ({
    targetType: link.targetType,
    targetId: link.targetId ?? null,
    url: link.url ?? null,
    label: link.label ?? null,
  }));
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
  spaceVisibility: typeof spaces.$inferSelect.visibility;
  spaceJoinPolicy: typeof spaces.$inferSelect.joinPolicy;
  spaceOwnerUserId: string;
  memberRole: typeof spaceMembers.$inferSelect.role | null;
}): SpaceAclResource {
  return {
    visibility: row.spaceVisibility,
    joinPolicy: row.spaceJoinPolicy,
    ownerUserId: row.spaceOwnerUserId,
    memberRole: row.memberRole,
  };
}

function assertBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) return [];
  return value as ContentBlock[];
}

async function listTagsAndLinksByContentIds(contentIds: string[]) {
  if (contentIds.length === 0) {
    return {
      tagsByItem: new Map<string, string[]>(),
      linksByItem: new Map<string, ContentLinkView[]>(),
    };
  }

  const [tagRows, linkRows] = await Promise.all([
    db
      .select({
        contentItemId: contentTags.contentItemId,
        tag: contentTags.tag,
      })
      .from(contentTags)
      .where(inArray(contentTags.contentItemId, contentIds))
      .orderBy(contentTags.tag),
    db
      .select({
        id: contentLinks.id,
        contentItemId: contentLinks.contentItemId,
        targetType: contentLinks.targetType,
        targetId: contentLinks.targetId,
        url: contentLinks.url,
        label: contentLinks.label,
      })
      .from(contentLinks)
      .where(inArray(contentLinks.contentItemId, contentIds))
      .orderBy(contentLinks.createdAt),
  ]);

  const tagsByItem = new Map<string, string[]>();
  for (const row of tagRows) {
    const current = tagsByItem.get(row.contentItemId) ?? [];
    current.push(row.tag);
    tagsByItem.set(row.contentItemId, current);
  }

  const linksByItem = new Map<string, ContentLinkView[]>();
  for (const row of linkRows) {
    const current = linksByItem.get(row.contentItemId) ?? [];
    current.push({
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      url: row.url,
      label: row.label,
    });
    linksByItem.set(row.contentItemId, current);
  }

  return { tagsByItem, linksByItem };
}

function canReadContentRow(actor: ReturnType<typeof resolveSubject>, row: ContentRow): boolean {
  const resource = toResource(row);
  if (row.status !== 'published') {
    if (!actor.userId) return false;
    if (row.authorUserId === actor.userId) return true;
    return canSpaceCapability(actor, resource, 'space.content.write')
      || canSpaceCapability(actor, resource, 'space.content.publish');
  }
  return canReadContent(actor, resource, row.visibility);
}

async function getSpaceForActor(spaceId: string, actorUserId: string | null): Promise<SpaceRow | null> {
  if (!actorUserId) {
    const [row] = await db
      .select({
        id: spaces.id,
        visibility: spaces.visibility,
        joinPolicy: spaces.joinPolicy,
        ownerUserId: spaces.ownerUserId,
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
      visibility: spaces.visibility,
      joinPolicy: spaces.joinPolicy,
      ownerUserId: spaces.ownerUserId,
      memberRole: spaceMembers.role,
    })
    .from(spaces)
    .leftJoin(
      spaceMembers,
      and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, actorUserId)),
    )
    .where(eq(spaces.id, spaceId))
    .limit(1);

  return row ?? null;
}

async function getContentRowForActor(contentId: string, actorUserId: string | null): Promise<ContentRow | null> {
  if (!actorUserId) {
    const [row] = await db
      .select({
        id: contentItems.id,
        spaceId: contentItems.spaceId,
        authorUserId: contentItems.authorUserId,
        authorDisplayName: users.displayName,
        title: contentItems.title,
        summary: contentItems.summary,
        coverImageUrl: contentItems.coverImageUrl,
        format: contentItems.format,
        visibility: contentItems.visibility,
        status: contentItems.status,
        blocks: contentItems.blocks,
        publishedAt: contentItems.publishedAt,
        archivedAt: contentItems.archivedAt,
        lastVersionNumber: contentItems.lastVersionNumber,
        createdAt: contentItems.createdAt,
        updatedAt: contentItems.updatedAt,
        updatedById: contentItems.updatedById,
        spaceVisibility: spaces.visibility,
        spaceJoinPolicy: spaces.joinPolicy,
        spaceOwnerUserId: spaces.ownerUserId,
      })
      .from(contentItems)
      .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
      .leftJoin(users, eq(users.id, contentItems.authorUserId))
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
      authorDisplayName: users.displayName,
      title: contentItems.title,
      summary: contentItems.summary,
      coverImageUrl: contentItems.coverImageUrl,
      format: contentItems.format,
      visibility: contentItems.visibility,
      status: contentItems.status,
      blocks: contentItems.blocks,
      publishedAt: contentItems.publishedAt,
      archivedAt: contentItems.archivedAt,
      lastVersionNumber: contentItems.lastVersionNumber,
      createdAt: contentItems.createdAt,
      updatedAt: contentItems.updatedAt,
      updatedById: contentItems.updatedById,
      spaceVisibility: spaces.visibility,
      spaceJoinPolicy: spaces.joinPolicy,
      spaceOwnerUserId: spaces.ownerUserId,
      memberRole: spaceMembers.role,
    })
    .from(contentItems)
    .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
    .leftJoin(users, eq(users.id, contentItems.authorUserId))
    .leftJoin(
      spaceMembers,
      and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, actorUserId)),
    )
    .where(eq(contentItems.id, contentId))
    .limit(1);

  return row ?? null;
}

function toContentView(
  row: ContentRow,
  tagsByItem: Map<string, string[]>,
  linksByItem: Map<string, ContentLinkView[]>,
): ContentItemView {
  return {
    id: row.id,
    spaceId: row.spaceId,
    authorUserId: row.authorUserId,
    authorDisplayName: row.authorDisplayName,
    title: row.title,
    summary: row.summary,
    coverImageUrl: row.coverImageUrl,
    format: row.format,
    visibility: row.visibility,
    status: row.status,
    blocks: assertBlocks(row.blocks),
    tags: tagsByItem.get(row.id) ?? [],
    links: linksByItem.get(row.id) ?? [],
    lastVersionNumber: row.lastVersionNumber,
    publishedAt: toIso(row.publishedAt),
    archivedAt: toIso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createContentItem(
  userId: string,
  input: {
    spaceId: string;
    title: string;
    summary?: string | null;
    coverImageUrl?: string | null;
    format: ContentFormat;
    visibility: ContentVisibility;
    blocks: ContentBlock[];
    tags?: string[];
    links?: ContentLinkInput[];
  },
  globalRoles?: PortalGlobalRole[],
): Promise<ContentItemView> {
  const subject = resolveSubject({ userId, globalRoles });
  const space = await getSpaceForActor(input.spaceId, userId);
  if (!space) throw new NotFoundError('Space not found');

  if (!canSpaceCapability(subject, space, 'space.content.write')) {
    throw new AccessDeniedError();
  }

  const now = new Date();
  const id = createEntityId('cnt');
  await db.transaction(async (tx) => {
    await tx.insert(contentItems).values({
      id,
      spaceId: input.spaceId,
      authorUserId: userId,
      title: input.title,
      summary: input.summary ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      format: input.format,
      visibility: input.visibility,
      status: 'draft',
      blocks: input.blocks,
      publishedAt: null,
      archivedAt: null,
      lastVersionNumber: 0,
      createdAt: now,
      updatedAt: now,
      updatedById: userId,
    });

    const tags = normalizeTags(input.tags);
    if (tags.length > 0) {
      await tx.insert(contentTags).values(
        tags.map((tag) => ({
          id: createEntityId('ctag'),
          contentItemId: id,
          tag,
          createdAt: now,
        })),
      );
    }

    const links = normalizeLinks(input.links);
    if (links.length > 0) {
      await tx.insert(contentLinks).values(
        links.map((link) => ({
          id: createEntityId('clink'),
          contentItemId: id,
          targetType: link.targetType,
          targetId: link.targetId,
          url: link.url,
          label: link.label,
          createdAt: now,
        })),
      );
    }
  });

  return getContentItem(id, { userId, globalRoles });
}

export async function updateContentDraft(
  contentId: string,
  userId: string,
  input: {
    title?: string;
    summary?: string | null;
    coverImageUrl?: string | null;
    format?: ContentFormat;
    visibility?: ContentVisibility;
    blocks?: ContentBlock[];
    tags?: string[];
    links?: ContentLinkInput[];
  },
  globalRoles?: PortalGlobalRole[],
): Promise<ContentItemView> {
  const subject = resolveSubject({ userId, globalRoles });
  const row = await getContentRowForActor(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  if (row.status === 'archived') throw new InvalidStateError('Archived content cannot be edited');

  const resource = toResource(row);
  if (!canSpaceCapability(subject, resource, 'space.content.write')) {
    throw new AccessDeniedError();
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(contentItems)
      .set({
        title: input.title,
        summary: input.summary,
        coverImageUrl: input.coverImageUrl,
        format: input.format,
        visibility: input.visibility,
        blocks: input.blocks,
        updatedAt: now,
        updatedById: userId,
      })
      .where(eq(contentItems.id, contentId));

    if (input.tags) {
      await tx.delete(contentTags).where(eq(contentTags.contentItemId, contentId));
      const tags = normalizeTags(input.tags);
      if (tags.length > 0) {
        await tx.insert(contentTags).values(
          tags.map((tag) => ({
            id: createEntityId('ctag'),
            contentItemId: contentId,
            tag,
            createdAt: now,
          })),
        );
      }
    }

    if (input.links) {
      await tx.delete(contentLinks).where(eq(contentLinks.contentItemId, contentId));
      const links = normalizeLinks(input.links);
      if (links.length > 0) {
        await tx.insert(contentLinks).values(
          links.map((link) => ({
            id: createEntityId('clink'),
            contentItemId: contentId,
            targetType: link.targetType,
            targetId: link.targetId,
            url: link.url,
            label: link.label,
            createdAt: now,
          })),
        );
      }
    }
  });

  return getContentItem(contentId, { userId, globalRoles });
}

export async function publishContentItem(
  contentId: string,
  userId: string,
  globalRoles?: PortalGlobalRole[],
): Promise<{ item: ContentItemView; version: ContentVersionView }> {
  const subject = resolveSubject({ userId, globalRoles });
  const row = await getContentRowForActor(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  if (row.status === 'archived') throw new InvalidStateError('Archived content cannot be published');

  const resource = toResource(row);
  if (!canSpaceCapability(subject, resource, 'space.content.publish')) {
    throw new AccessDeniedError();
  }
  assertContentPublishVisibilityPolicy(row.spaceVisibility, row.visibility);

  const now = new Date();
  const nextVersion = row.lastVersionNumber + 1;
  const [tags, links] = await Promise.all([
    db
      .select({ tag: contentTags.tag })
      .from(contentTags)
      .where(eq(contentTags.contentItemId, contentId))
      .orderBy(contentTags.tag),
    db
      .select({
        targetType: contentLinks.targetType,
        targetId: contentLinks.targetId,
        url: contentLinks.url,
        label: contentLinks.label,
      })
      .from(contentLinks)
      .where(eq(contentLinks.contentItemId, contentId))
      .orderBy(contentLinks.createdAt),
  ]);

  const snapshot = {
    title: row.title,
    summary: row.summary,
    format: row.format,
    visibility: row.visibility,
    status: 'published',
    blocks: row.blocks,
    tags: tags.map((tag) => tag.tag),
    links,
  };

  const versionId = createEntityId('cver');
  await db.transaction(async (tx) => {
    await tx.insert(contentVersions).values({
      id: versionId,
      contentItemId: contentId,
      versionNumber: nextVersion,
      title: row.title,
      summary: row.summary,
      format: row.format,
      visibility: row.visibility,
      status: 'published',
      snapshot,
      createdById: userId,
      createdAt: now,
    });

    await tx
      .update(contentItems)
      .set({
        status: 'published',
        publishedAt: now,
        archivedAt: null,
        lastVersionNumber: nextVersion,
        updatedAt: now,
        updatedById: userId,
      })
      .where(eq(contentItems.id, contentId));
  });

  return {
    item: await getContentItem(contentId, { userId, globalRoles }),
    version: {
      id: versionId,
      contentItemId: contentId,
      versionNumber: nextVersion,
      status: 'published',
      createdAt: now.toISOString(),
    },
  };
}

export async function archiveContentItem(
  contentId: string,
  userId: string,
  globalRoles?: PortalGlobalRole[],
): Promise<ContentItemView> {
  const subject = resolveSubject({ userId, globalRoles });
  const row = await getContentRowForActor(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  if (row.status === 'archived') {
    return getContentItem(contentId, { userId, globalRoles });
  }

  const resource = toResource(row);
  if (!canSpaceCapability(subject, resource, 'space.content.publish')) {
    throw new AccessDeniedError();
  }

  const now = new Date();
  await db
    .update(contentItems)
    .set({
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
      updatedById: userId,
    })
    .where(eq(contentItems.id, contentId));

  return getContentItem(contentId, { userId, globalRoles });
}

export async function unarchiveContentItem(
  contentId: string,
  userId: string,
  globalRoles?: PortalGlobalRole[],
): Promise<ContentItemView> {
  const subject = resolveSubject({ userId, globalRoles });
  const row = await getContentRowForActor(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');
  if (row.status !== 'archived') {
    return getContentItem(contentId, { userId, globalRoles });
  }

  const resource = toResource(row);
  if (!canSpaceCapability(subject, resource, 'space.content.publish')) {
    throw new AccessDeniedError();
  }

  const now = new Date();
  await db
    .update(contentItems)
    .set({
      status: 'draft',
      archivedAt: null,
      updatedAt: now,
      updatedById: userId,
    })
    .where(eq(contentItems.id, contentId));

  return getContentItem(contentId, { userId, globalRoles });
}

export async function hardDeleteContentItem(
  contentId: string,
  userId: string,
  globalRoles?: PortalGlobalRole[],
): Promise<{ deleted: true }> {
  const row = await getContentRowForActor(contentId, userId);
  if (!row) throw new NotFoundError('Content item not found');

  if (row.authorUserId !== userId) {
    throw new AccessDeniedError();
  }

  await db.delete(contentItems).where(eq(contentItems.id, contentId));

  return { deleted: true };
}

export async function getContentItem(
  contentId: string,
  actor: ContentActorInput,
): Promise<ContentItemView> {
  const row = await getContentRowForActor(contentId, actor.userId);
  if (!row) throw new NotFoundError('Content item not found');

  const subject = resolveSubject(actor);
  if (!canReadContentRow(subject, row)) {
    throw new AccessDeniedError();
  }

  const { tagsByItem, linksByItem } = await listTagsAndLinksByContentIds([row.id]);
  return toContentView(row, tagsByItem, linksByItem);
}

export async function listContentItemsForActor(
  actor: ContentActorInput,
  input?: {
    spaceId?: string;
    query?: string;
    format?: ContentFormat;
    visibility?: ContentVisibility;
    status?: ContentStatus;
    limit?: number;
  },
): Promise<ContentItemView[]> {
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 500);
  const conditions: SQL<unknown>[] = [];
  if (input?.spaceId) {
    conditions.push(eq(contentItems.spaceId, input.spaceId));
  }
  if (input?.query) {
    const pattern = `%${input.query.trim()}%`;
    conditions.push(
      ilike(contentItems.title, pattern),
    );
  }
  if (input?.format) {
    conditions.push(eq(contentItems.format, input.format));
  }
  if (input?.visibility) {
    conditions.push(eq(contentItems.visibility, input.visibility));
  }
  if (input?.status) {
    conditions.push(eq(contentItems.status, input.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const actorUserId = actor.userId;

  const rows = actorUserId
    ? await db
        .select({
          id: contentItems.id,
          spaceId: contentItems.spaceId,
          authorUserId: contentItems.authorUserId,
          authorDisplayName: users.displayName,
          title: contentItems.title,
          summary: contentItems.summary,
          coverImageUrl: contentItems.coverImageUrl,
          format: contentItems.format,
          visibility: contentItems.visibility,
          status: contentItems.status,
          blocks: contentItems.blocks,
          publishedAt: contentItems.publishedAt,
          archivedAt: contentItems.archivedAt,
          lastVersionNumber: contentItems.lastVersionNumber,
          createdAt: contentItems.createdAt,
          updatedAt: contentItems.updatedAt,
          updatedById: contentItems.updatedById,
          spaceVisibility: spaces.visibility,
          spaceJoinPolicy: spaces.joinPolicy,
          spaceOwnerUserId: spaces.ownerUserId,
          memberRole: spaceMembers.role,
        })
        .from(contentItems)
        .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
        .leftJoin(users, eq(users.id, contentItems.authorUserId))
        .leftJoin(
          spaceMembers,
          and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, actorUserId)),
        )
        .where(whereClause)
        .orderBy(desc(contentItems.updatedAt))
        .limit(limit * 4)
    : await db
        .select({
          id: contentItems.id,
          spaceId: contentItems.spaceId,
          authorUserId: contentItems.authorUserId,
          authorDisplayName: users.displayName,
          title: contentItems.title,
          summary: contentItems.summary,
          coverImageUrl: contentItems.coverImageUrl,
          format: contentItems.format,
          visibility: contentItems.visibility,
          status: contentItems.status,
          blocks: contentItems.blocks,
          publishedAt: contentItems.publishedAt,
          archivedAt: contentItems.archivedAt,
          lastVersionNumber: contentItems.lastVersionNumber,
          createdAt: contentItems.createdAt,
          updatedAt: contentItems.updatedAt,
          updatedById: contentItems.updatedById,
          spaceVisibility: spaces.visibility,
          spaceJoinPolicy: spaces.joinPolicy,
          spaceOwnerUserId: spaces.ownerUserId,
        })
        .from(contentItems)
        .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
        .leftJoin(users, eq(users.id, contentItems.authorUserId))
        .where(whereClause)
        .orderBy(desc(contentItems.updatedAt))
        .limit(limit * 4)
        .then((values) => values.map((value) => ({ ...value, memberRole: null })));

  const subject = resolveSubject(actor);
  const filtered = rows.filter((row) => canReadContentRow(subject, row));
  const selected = filtered.slice(0, limit);
  const ids = selected.map((row) => row.id);
  const { tagsByItem, linksByItem } = await listTagsAndLinksByContentIds(ids);

  return selected.map((row) => toContentView(row, tagsByItem, linksByItem));
}

export async function listContentFeedForActor(
  actor: ContentActorInput,
  input?: {
    query?: string;
    limit?: number;
  },
) {
  return listContentItemsForActor(actor, {
    query: input?.query,
    status: 'published',
    limit: input?.limit ?? 12,
  });
}

export async function searchPublishedContentForActor(
  actor: ContentActorInput,
  query: string,
  limit = 6,
) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return listContentItemsForActor(actor, {
    query: trimmed,
    status: 'published',
    limit,
  });
}
