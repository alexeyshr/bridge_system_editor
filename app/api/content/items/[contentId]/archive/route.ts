import { badRequest, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { archiveContentItem } from '@/lib/server/content-service';

type RouteContext = {
  params: Promise<{ contentId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const { contentId } = await context.params;
  if (!contentId) return badRequest('contentId is required');

  try {
    const item = await archiveContentItem(contentId, user.id, user.globalRoles);
    return ok({ item });
  } catch (error) {
    console.error('Failed to archive content item', error);
    return serverError('Failed to archive content item');
  }
}
