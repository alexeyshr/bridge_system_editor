import { badRequest, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { getServerAuthSession } from '@/lib/auth/session';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { createContentItem, listContentItemsForActor } from '@/lib/server/content-service';
import { createContentItemSchema, listContentItemsSchema } from '@/lib/validation/content';
import { z } from 'zod';

const querySchema = listContentItemsSchema.extend({
  q: z.string().trim().max(160).optional(),
});

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    spaceId: url.searchParams.get('spaceId') ?? undefined,
    query: url.searchParams.get('query') ?? url.searchParams.get('q') ?? undefined,
    format: url.searchParams.get('format') ?? undefined,
    visibility: url.searchParams.get('visibility') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    limit: parseLimit(url.searchParams.get('limit')),
  });

  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  try {
    const items = await listContentItemsForActor(
      {
        userId: session?.user?.id ?? null,
        globalRoles: session?.user?.globalRoles,
      },
      parsed.data,
    );
    return ok({ items });
  } catch (error) {
    console.error('Failed to list content items', error);
    return serverError('Failed to list content items');
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const payload = await request.json().catch(() => null);
  const parsed = createContentItemSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  try {
    const item = await createContentItem(user.id, parsed.data, user.globalRoles);
    return ok({ item });
  } catch (error) {
    console.error('Failed to create content item', error);
    return serverError('Failed to create content item');
  }
}
