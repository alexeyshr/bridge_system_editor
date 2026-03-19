import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle/client';
import { contentComments, contentItems, users } from '@/lib/db/drizzle/schema';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { ok, badRequest, unauthorized, notFound, serverError } from '@/lib/server/api-response';

function createCommentId() {
  return `cmt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await params;

  try {
    // Verify content exists
    const [item] = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.id, contentId))
      .limit(1);

    if (!item) return notFound('Content not found');

    const comments = await db
      .select({
        id: contentComments.id,
        contentItemId: contentComments.contentItemId,
        authorUserId: contentComments.authorUserId,
        authorDisplayName: users.displayName,
        authorBridgesportPlayerId: users.bridgesportPlayerId,
        parentCommentId: contentComments.parentCommentId,
        body: contentComments.body,
        createdAt: contentComments.createdAt,
      })
      .from(contentComments)
      .leftJoin(users, eq(users.id, contentComments.authorUserId))
      .where(eq(contentComments.contentItemId, contentId))
      .orderBy(asc(contentComments.createdAt));

    return ok({
      comments: comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Comments GET error:', error);
    return serverError('Failed to load comments');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const { contentId } = await params;

  try {
    const json = await request.json().catch(() => null);
    const body = json?.body?.trim();
    const parentCommentId = json?.parentCommentId ?? null;

    if (!body || typeof body !== 'string') {
      return badRequest('Comment body is required');
    }
    if (body.length > 2000) {
      return badRequest('Comment must be under 2000 characters');
    }

    // Verify content exists
    const [item] = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.id, contentId))
      .limit(1);

    if (!item) return notFound('Content not found');

    // Verify parent exists if replying
    if (parentCommentId) {
      const [parent] = await db
        .select({ id: contentComments.id, contentItemId: contentComments.contentItemId })
        .from(contentComments)
        .where(eq(contentComments.id, parentCommentId))
        .limit(1);

      if (!parent || parent.contentItemId !== contentId) {
        return badRequest('Parent comment not found');
      }
    }

    const id = createCommentId();
    const now = new Date();

    await db.insert(contentComments).values({
      id,
      contentItemId: contentId,
      authorUserId: user.id,
      parentCommentId,
      body,
      createdAt: now,
      updatedAt: now,
    });

    // Return the created comment with author info
    const [author] = await db
      .select({
        displayName: users.displayName,
        bridgesportPlayerId: users.bridgesportPlayerId,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    return ok({
      comment: {
        id,
        contentItemId: contentId,
        authorUserId: user.id,
        authorDisplayName: author?.displayName ?? null,
        authorBridgesportPlayerId: author?.bridgesportPlayerId ?? null,
        parentCommentId,
        body,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Comments POST error:', error);
    return serverError('Failed to create comment');
  }
}
