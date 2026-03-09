import { gone, notFound, ok, serverError } from '@/lib/server/api-response';
import { InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';
import { logError } from '@/lib/server/logger';
import { getReadOnlyPublishedSnapshot } from '@/lib/server/publish-links-service';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  try {
    const snapshot = await getReadOnlyPublishedSnapshot(token);
    return ok({ snapshot });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof InvalidStateError) return gone(error.message);
    logError({
      event: 'read_only_links.access.failed',
      message: 'Failed to read published snapshot',
      tokenSuffix: token.slice(-6),
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to read published snapshot');
  }
}
