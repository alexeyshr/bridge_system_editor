import { requireAuthUser } from '@/lib/server/auth-guard';
import {
  badRequest,
  created,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/server/api-response';
import { AccessDeniedError, InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';
import { logError } from '@/lib/server/logger';
import {
  createReadOnlyLink,
  listReadOnlyLinks,
  revokeReadOnlyLink,
  rotateReadOnlyLink,
} from '@/lib/server/publish-links-service';
import { createReadOnlyLinkSchema, manageReadOnlyLinkSchema } from '@/lib/validation/publish-links';

type RouteContext = {
  params: Promise<{ systemId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const links = await listReadOnlyLinks(systemId, user.id);
    return ok({ links });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    logError({
      event: 'read_only_links.list.failed',
      message: 'Failed to list read-only links',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to list read-only links');
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const json = await request.json();
    const parsed = createReadOnlyLinkSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid read-only link payload', parsed.error.flatten());
    }
    const link = await createReadOnlyLink(systemId, user.id, parsed.data);
    return created({ link });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof InvalidStateError) return badRequest(error.message);
    logError({
      event: 'read_only_links.create.failed',
      message: 'Failed to create read-only link',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to create read-only link');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const json = await request.json();
    const action = typeof json?.action === 'string' ? json.action : '';
    const parsed = manageReadOnlyLinkSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid read-only link action payload', parsed.error.flatten());
    }

    if (action === 'revoke') {
      const link = await revokeReadOnlyLink(systemId, user.id, parsed.data.linkId);
      return ok({ link });
    }
    if (action === 'rotate') {
      const link = await rotateReadOnlyLink(systemId, user.id, parsed.data.linkId);
      return ok({ link });
    }

    return badRequest('Unsupported action');
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof InvalidStateError) return badRequest(error.message);
    logError({
      event: 'read_only_links.update.failed',
      message: 'Failed to update read-only link',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to update read-only link');
  }
}
