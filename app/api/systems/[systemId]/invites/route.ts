import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, created, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { createInviteForSystem, listInvitesForSystem } from '@/lib/server/invite-service';
import { AccessDeniedError, NotFoundError, UserLookupError, assertSystemCapability } from '@/lib/server/systems-service';
import { createInviteSchema } from '@/lib/validation/invites';

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
    console.error('Failed to list invites', error);
    return serverError('Failed to list invites');
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { systemId } = await context.params;

  try {
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
    if (error instanceof UserLookupError) return badRequest(error.message);
    console.error('Failed to create invite', error);
    return serverError('Failed to create invite');
  }
}
