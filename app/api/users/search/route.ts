import { searchUsers } from '@/lib/server/users-service';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, ok, serverError, unauthorized } from '@/lib/server/api-response';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 10;

export async function GET(request: Request) {
  const currentUser = await requireAuthUser();
  if (!currentUser) return unauthorized();

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < MIN_QUERY_LENGTH) {
    return badRequest(`Query must be at least ${MIN_QUERY_LENGTH} characters`);
  }

  try {
    const users = await searchUsers(q, currentUser.id, MAX_RESULTS);

    return ok({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        telegramUsername: user.telegramUsername,
      })),
    });
  } catch (error) {
    console.error('User search failed', error);
    return serverError('Failed to search users');
  }
}
