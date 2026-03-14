import { ok, serverError } from '@/lib/server/api-response';
import { getServerAuthSession } from '@/lib/auth/session';
import { listContentFeedForActor } from '@/lib/server/content-service';

function normalizeLimit(input: string | null): number {
  const parsed = Number.parseInt(input ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 12;
  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = normalizeLimit(url.searchParams.get('limit'));
  const query = url.searchParams.get('q')?.trim() || undefined;
  const session = await getServerAuthSession();

  try {
    const items = await listContentFeedForActor(
      {
        userId: session?.user?.id ?? null,
        globalRoles: session?.user?.globalRoles,
      },
      { limit, query },
    );
    return ok({ items });
  } catch (error) {
    console.error('Failed to load content feed', error);
    return serverError('Failed to load content feed');
  }
}
