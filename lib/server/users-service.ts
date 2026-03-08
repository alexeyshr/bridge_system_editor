import { db } from '@/lib/db/drizzle/client';
import { users } from '@/lib/db/drizzle/schema';
import { and, asc, ilike, ne, or } from 'drizzle-orm';

export type SearchUserResult = {
  id: string;
  email: string | null;
  displayName: string | null;
  telegramUsername: string | null;
};

export async function searchUsers(query: string, currentUserId: string, limit = 10): Promise<SearchUserResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const pattern = `%${normalized}%`;
  return db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      telegramUsername: users.telegramUsername,
    })
    .from(users)
    .where(
      and(
        ne(users.id, currentUserId),
        or(
          ilike(users.email, pattern),
          ilike(users.displayName, pattern),
          ilike(users.telegramUsername, pattern),
        ),
      ),
    )
    .orderBy(asc(users.displayName), asc(users.email))
    .limit(limit);
}
