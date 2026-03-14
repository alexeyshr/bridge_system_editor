import { badRequest, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { publishContentItem } from '@/lib/server/content-service';

type RouteContext = {
  params: Promise<{ contentId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const { contentId } = await context.params;
  if (!contentId) return badRequest('contentId is required');

  try {
    const result = await publishContentItem(contentId, user.id, user.globalRoles);
    return ok({ result });
  } catch (error) {
    console.error('Failed to publish content item', error);
    return serverError('Failed to publish content item');
  }
}
