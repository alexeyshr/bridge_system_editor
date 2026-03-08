import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { AccessDeniedError, NotFoundError, getSystemForUser, updateSystemMetadata } from '@/lib/server/systems-service';
import { updateSystemSchema } from '@/lib/validation/systems';

type RouteContext = {
  params: Promise<{ systemId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const { systemId } = await context.params;

  try {
    const system = await getSystemForUser(systemId, user.id);
    return ok({ system });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    console.error('Failed to get system', error);
    return serverError('Failed to get system');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const { systemId } = await context.params;

  try {
    const json = await request.json();
    const parsed = updateSystemSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid update payload', parsed.error.flatten());
    }

    const system = await updateSystemMetadata(systemId, user.id, parsed.data);
    return ok({ system });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AccessDeniedError) return forbidden();
    console.error('Failed to update system', error);
    return serverError('Failed to update system');
  }
}
