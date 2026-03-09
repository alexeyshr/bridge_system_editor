import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, created, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { AccessDeniedError, InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';
import {
  createDiscussionThread,
  listDiscussionThreads,
} from '@/lib/server/discussion-service';
import { logError } from '@/lib/server/logger';
import { createDiscussionThreadSchema, listDiscussionThreadsSchema } from '@/lib/validation/discussions';

type RouteContext = {
  params: Promise<{ systemId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') ?? undefined;
  const scopeNodeId = url.searchParams.get('scopeNodeId') ?? undefined;
  const parsed = listDiscussionThreadsSchema.safeParse({
    scope: scope || undefined,
    scopeNodeId: scopeNodeId || undefined,
  });
  if (!parsed.success) {
    return badRequest('Invalid query payload', parsed.error.flatten());
  }

  try {
    const threads = await listDiscussionThreads(systemId, user.id, parsed.data);
    return ok({ threads });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    logError({
      event: 'discussions.threads.list.failed',
      message: 'Failed to list discussion threads',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to list discussion threads');
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const json = await request.json();
    const parsed = createDiscussionThreadSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid discussion thread payload', parsed.error.flatten());
    }

    const thread = await createDiscussionThread(systemId, user.id, parsed.data);
    return created({ thread });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof InvalidStateError) return badRequest(error.message);
    logError({
      event: 'discussions.threads.create.failed',
      message: 'Failed to create discussion thread',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to create discussion thread');
  }
}
