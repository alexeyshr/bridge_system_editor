import { and, asc, desc, eq, ilike, ne, or } from 'drizzle-orm';

import type { GlobalSearchResponse } from '@/lib/portal-search';
import { hasCapability, listCapabilitiesForRoles } from '@/lib/portal-access';
import { db } from '@/lib/db/drizzle/client';
import {
  discussionThreads,
  tournamentSystemBindings,
  userScopedRoles,
  users,
} from '@/lib/db/drizzle/schema';
import { badRequest, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { can } from '@/lib/server/portal-rbac';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_GROUP = 6;

function toUniqueIds(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function GET(request: Request) {
  const currentUser = await requireAuthUser();
  if (!currentUser) return unauthorized();

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < MIN_QUERY_LENGTH) {
    return badRequest(`Query must be at least ${MIN_QUERY_LENGTH} characters`);
  }

  const pattern = `%${q}%`;
  const globalCapabilities = listCapabilitiesForRoles(currentUser.globalRoles);
  const principal = {
    userId: currentUser.id,
    globalRoles: currentUser.globalRoles,
  };

  try {
    const usersPromise = db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(
        and(
          ne(users.id, currentUser.id),
          or(
            ilike(users.email, pattern),
            ilike(users.displayName, pattern),
            ilike(users.telegramUsername, pattern),
          ),
        ),
      )
      .orderBy(asc(users.displayName), asc(users.email))
      .limit(MAX_RESULTS_PER_GROUP);

    const scopedTournamentPromise = db
      .select({
        tournamentId: userScopedRoles.scopeId,
      })
      .from(userScopedRoles)
      .where(
        and(
          eq(userScopedRoles.scopeType, 'tournament'),
          ilike(userScopedRoles.scopeId, pattern),
        ),
      )
      .limit(MAX_RESULTS_PER_GROUP * 2);

    const bindingTournamentPromise = db
      .select({
        tournamentId: tournamentSystemBindings.tournamentId,
      })
      .from(tournamentSystemBindings)
      .where(ilike(tournamentSystemBindings.tournamentId, pattern))
      .groupBy(tournamentSystemBindings.tournamentId)
      .limit(MAX_RESULTS_PER_GROUP * 2);

    const postPromise = hasCapability(globalCapabilities, 'discussion.read')
      ? db
          .select({
            id: discussionThreads.id,
            title: discussionThreads.title,
            systemId: discussionThreads.systemId,
            updatedAt: discussionThreads.updatedAt,
          })
          .from(discussionThreads)
          .where(
            or(
              ilike(discussionThreads.title, pattern),
              ilike(discussionThreads.systemId, pattern),
            ),
          )
          .orderBy(desc(discussionThreads.updatedAt))
          .limit(MAX_RESULTS_PER_GROUP)
      : Promise.resolve([]);

    const [
      userRows,
      scopedTournamentRows,
      bindingTournamentRows,
      postRows,
    ] = await Promise.all([
      usersPromise,
      scopedTournamentPromise,
      bindingTournamentPromise,
      postPromise,
    ]);

    const tournamentIds = toUniqueIds([
      ...scopedTournamentRows.map((row) => row.tournamentId),
      ...bindingTournamentRows.map((row) => row.tournamentId),
    ]);

    const tournaments: GlobalSearchResponse['tournaments'] = [];
    for (const tournamentId of tournamentIds) {
      const isAllowed = await can(
        principal,
        'tournament.read',
        { type: 'tournament', id: tournamentId },
      );
      if (!isAllowed) continue;

      tournaments.push({
        id: tournamentId,
        label: `Tournament ${tournamentId}`,
        subtitle: `Scope: tournament:${tournamentId}`,
        href: `/dashboard/tournaments/${encodeURIComponent(tournamentId)}`,
      });

      if (tournaments.length >= MAX_RESULTS_PER_GROUP) break;
    }

    const response: GlobalSearchResponse = {
      query: q,
      users: userRows.map((row) => ({
        id: row.id,
        label: row.displayName ?? row.email ?? 'Unnamed user',
        subtitle: row.email ?? 'No email',
        href: row.email ? `mailto:${row.email}` : '/dashboard',
      })),
      tournaments,
      posts: postRows.map((row) => ({
        id: row.id,
        label: row.title ?? `Discussion ${row.id}`,
        subtitle: `System: ${row.systemId}`,
        href: '/dashboard',
      })),
    };

    return ok(response);
  } catch (error) {
    console.error('Failed to search global portal content', error);
    return serverError('Failed to search portal content');
  }
}
