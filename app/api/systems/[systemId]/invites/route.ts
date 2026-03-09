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
import { createInviteForSystem, listInvitesForSystem, revokeInviteForSystem } from '@/lib/server/invite-service';
import { logError, logWarn } from '@/lib/server/logger';
import { checkRateLimit } from '@/lib/server/rate-limit';
import {
  AccessDeniedError,
  InvalidStateError,
  NotFoundError,
  RateLimitError,
  UserLookupError,
  assertSystemCapability,
} from '@/lib/server/systems-service';
import { createInviteSchema, revokeInviteSchema } from '@/lib/validation/invites';

type RouteContext = {
  params: Promise<{ systemId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    await assertSystemCapability(systemId, user.id, 'invites.manage');
    const invites = await listInvitesForSystem(systemId, user.id);
    return ok({ invites });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    logError({
      event: 'invites.list.failed',
      message: 'Failed to list invites',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to list invites');
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const limitKey = `invite:create:${user.id}:${systemId}`;
    const limit = checkRateLimit(limitKey, 20, 60_000);
    if (!limit.allowed) {
      logWarn({
        event: 'invites.create.rate_limited',
        userId: user.id,
        systemId,
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      throw new RateLimitError(limit.retryAfterSeconds);
    }

    await assertSystemCapability(systemId, user.id, 'invites.manage');
    const json = await request.json();
    const parsed = createInviteSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid invite payload', parsed.error.flatten());
    }

    const invite = await createInviteForSystem(systemId, user.id, parsed.data);
    return created({ invite });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof RateLimitError) return tooManyRequests(error.message, error.retryAfterSeconds);
    if (error instanceof UserLookupError) return badRequest(error.message);
    logError({
      event: 'invites.create.failed',
      message: 'Failed to create invite',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to create invite');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    await assertSystemCapability(systemId, user.id, 'invites.manage');
    const json = await request.json();
    const parsed = revokeInviteSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid revoke payload', parsed.error.flatten());
    }

    const invite = await revokeInviteForSystem(systemId, user.id, parsed.data.inviteId);
    return ok({ invite });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof InvalidStateError) return badRequest(error.message);
    logError({
      event: 'invites.revoke.failed',
      message: 'Failed to revoke invite',
      userId: user.id,
      systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return serverError('Failed to revoke invite');
  }
}
