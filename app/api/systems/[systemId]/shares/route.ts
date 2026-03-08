import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/server/api-response';
import {
  AccessDeniedError,
  NotFoundError,
  UserLookupError,
  listSystemShares,
  upsertSystemShare,
} from '@/lib/server/systems-service';
import { upsertShareSchema } from '@/lib/validation/systems';

type RouteContext = {
  params: Promise<{ systemId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const shares = await listSystemShares(systemId, user.id);
    return ok({ shares });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    console.error('Failed to list shares', error);
    return serverError('Failed to list shares');
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
    const json = await request.json();
    const parsed = upsertShareSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid share payload', parsed.error.flatten());
    }

    const share = await upsertSystemShare(systemId, user.id, parsed.data);
    return ok({ share });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof UserLookupError) return badRequest(error.message);
    console.error('Failed to upsert share', error);
    return serverError('Failed to update share');
  }
}
