import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, conflict, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/server/api-response';
import {
  AccessDeniedError,
  NotFoundError,
  RevisionConflictError,
  upsertSystemNodes,
} from '@/lib/server/systems-service';
import { upsertNodesSchema } from '@/lib/validation/systems';

type RouteContext = {
  params: Promise<{ systemId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const { systemId } = await context.params;

  try {
    const json = await request.json();
    const parsed = upsertNodesSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid nodes payload', parsed.error.flatten());
    }

    const result = await upsertSystemNodes(systemId, user.id, parsed.data);
    return ok({ sync: result });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    if (error instanceof RevisionConflictError) return conflict(error.message);
    console.error('Failed to upsert nodes', error);
    return serverError('Failed to save nodes');
  }
}
