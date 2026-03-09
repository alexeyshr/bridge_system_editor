import { requireAuthUser } from '@/lib/server/auth-guard';
import {
  badRequest,
  created,
  forbidden,
  notFound,
  ok,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/server/api-response';
import { AccessDeniedError, InvalidStateError, NotFoundError, RateLimitError } from '@/lib/server/domain-errors';
import { listDiscussionMessages, postDiscussionMessage } from '@/lib/server/discussion-service';
import { logError, logWarn } from '@/lib/server/logger';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { postDiscussionMessageSchema } from '@/lib/validation/discussions';

type RouteContext = {
  params: Promise<{ systemId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;
  const url = new URL(request.url);
  const threadId = url.searchParams.get('threadId')?.trim() ?? '';
  if (!threadId) return badRequest('threadId is required');

  try {
    const messages = await listDiscussionMessages(systemId, user.id, threadId);
    return ok({ messages });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    logError({
      event: 'discussions.messages.list.failed',
      message: 'Failed to list discussion messages',
      userId: user.id,
      systemId,
      threadId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to list discussion messages');
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const limitKey = `discussion:post:${user.id}:${systemId}`;
    const limit = checkRateLimit(limitKey, 40, 60_000);
    if (!limit.allowed) {
      logWarn({
        event: 'discussions.messages.rate_limited',
        userId: user.id,
        systemId,
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      throw new RateLimitError(limit.retryAfterSeconds);
    }

    const json = await request.json();
    const parsed = postDiscussionMessageSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid discussion message payload', parsed.error.flatten());
    }

    const message = await postDiscussionMessage(systemId, user.id, parsed.data);
    return created({ message });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof InvalidStateError) return badRequest(error.message);
    if (error instanceof RateLimitError) return tooManyRequests(error.message, error.retryAfterSeconds);
    logError({
      event: 'discussions.messages.create.failed',
      message: 'Failed to create discussion message',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to create discussion message');
  }
}
