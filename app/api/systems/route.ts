import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, created, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { createSystemForUser, listSystemsForUser } from '@/lib/server/systems-service';
import { createSystemSchema, listSystemsSchema } from '@/lib/validation/systems';

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const url = new URL(request.url);
    const parsed = listSystemsSchema.safeParse({
      query: url.searchParams.get('query') ?? undefined,
      access: url.searchParams.get('access') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      tag: url.searchParams.get('tag') ?? undefined,
    });
    if (!parsed.success) {
      return badRequest('Invalid systems filter payload', parsed.error.flatten());
    }

    const systems = await listSystemsForUser(user.id, parsed.data);
    return ok({ systems });
  } catch (error) {
    console.error('Failed to list systems', error);
    return serverError('Failed to list systems');
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const json = await request.json();
    const parsed = createSystemSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid create payload', parsed.error.flatten());
    }

    const system = await createSystemForUser(user.id, {
      title: parsed.data.title,
      description: parsed.data.description,
      templateId: parsed.data.templateId,
    });

    return created({ system });
  } catch (error) {
    console.error('Failed to create system', error);
    return serverError('Failed to create system');
  }
}
