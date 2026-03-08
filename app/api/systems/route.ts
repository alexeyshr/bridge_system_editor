import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, created, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { createSystemForUser, listSystemsForUser } from '@/lib/server/systems-service';
import { createSystemSchema } from '@/lib/validation/systems';

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const systems = await listSystemsForUser(user.id);
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
    });

    return created({ system });
  } catch (error) {
    console.error('Failed to create system', error);
    return serverError('Failed to create system');
  }
}
