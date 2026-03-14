import { badRequest, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { getServerAuthSession } from '@/lib/auth/session';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { getContentItem, updateContentDraft } from '@/lib/server/content-service';
import { updateContentDraftSchema } from '@/lib/validation/content';

type RouteContext = {
  params: Promise<{ contentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  const { contentId } = await context.params;

  if (!contentId) return badRequest('contentId is required');

  try {
    const item = await getContentItem(contentId, {
      userId: session?.user?.id ?? null,
      globalRoles: session?.user?.globalRoles,
    });
    return ok({ item });
  } catch (error) {
    console.error('Failed to load content item', error);
    return serverError('Failed to load content item');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const { contentId } = await context.params;
  if (!contentId) return badRequest('contentId is required');

  const payload = await request.json().catch(() => null);
  const parsed = updateContentDraftSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  try {
    const item = await updateContentDraft(contentId, user.id, parsed.data, user.globalRoles);
    return ok({ item });
  } catch (error) {
    console.error('Failed to update content draft', error);
    return serverError('Failed to update content draft');
  }
}
