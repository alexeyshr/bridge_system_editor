import { requireAuthUser } from '@/lib/server/auth-guard';
import { forbidden, gone, notFound, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { acceptInviteToken } from '@/lib/server/invite-service';
import { AccessDeniedError, NotFoundError } from '@/lib/server/systems-service';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();
  const { token } = await context.params;

  try {
    const result = await acceptInviteToken(token, user.id);
    return ok({ invite: result });
  } catch (error) {
    if (error instanceof NotFoundError) {
      if (error.message.toLowerCase().includes('expired')) return gone(error.message);
      return notFound(error.message);
    }
    if (error instanceof AccessDeniedError) return forbidden();
    console.error('Failed to accept invite', error);
    return serverError('Failed to accept invite');
  }
}
