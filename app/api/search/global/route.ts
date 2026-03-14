import { and, asc, desc, eq, ilike, ne, or } from 'drizzle-orm';

import type { GlobalSearchResponse } from '@/lib/portal-search';
import { hasCapability, listCapabilitiesForRoles } from '@/lib/portal-access';
import { getServerAuthSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle/client';
import {
  contentItems,
  spaceMembers,
  spaces,
  tournamentSystemBindings,
  userScopedRoles,
  users,
} from '@/lib/db/drizzle/schema';
import { badRequest, ok, serverError } from '@/lib/server/api-response';
import { can } from '@/lib/server/portal-rbac';
import { canReadContent } from '@/lib/server/space-acl';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_GROUP = 6;

function toUniqueIds(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const currentUser = session?.user?.id
    ? {
        id: session.user.id,
        globalRoles: session.user.globalRoles ?? ['user'],
      }
    : null;

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < MIN_QUERY_LENGTH) {
    return badRequest(`Query must be at least ${MIN_QUERY_LENGTH} characters`);
  }

  const pattern = `%${q}%`;
  const globalCapabilities = listCapabilitiesForRoles(
    currentUser?.globalRoles?.length ? currentUser.globalRoles : ['anonymous'],
  );
  const principal = {
    userId: currentUser?.id ?? null,
    globalRoles: currentUser?.globalRoles ?? [],
  };

  try {
    const canSearchUsers = Boolean(currentUser);
    const canSearchTournaments = hasCapability(globalCapabilities, 'tournament.read');

    const usersPromise = canSearchUsers && currentUser
      ? db
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
          .limit(MAX_RESULTS_PER_GROUP)
      : Promise.resolve([]);

    const scopedTournamentPromise = canSearchTournaments
      ? db
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
          .limit(MAX_RESULTS_PER_GROUP * 2)
      : Promise.resolve([]);

    const bindingTournamentPromise = canSearchTournaments
      ? db
          .select({
            tournamentId: tournamentSystemBindings.tournamentId,
          })
          .from(tournamentSystemBindings)
          .where(ilike(tournamentSystemBindings.tournamentId, pattern))
          .groupBy(tournamentSystemBindings.tournamentId)
          .limit(MAX_RESULTS_PER_GROUP * 2)
      : Promise.resolve([]);

    const postPromise = hasCapability(globalCapabilities, 'discussion.read')
      ? currentUser
        ? db
            .select({
              id: contentItems.id,
              title: contentItems.title,
              summary: contentItems.summary,
              format: contentItems.format,
              visibility: contentItems.visibility,
              updatedAt: contentItems.updatedAt,
              spaceId: contentItems.spaceId,
              spaceVisibility: spaces.visibility,
              spaceJoinPolicy: spaces.joinPolicy,
              spaceOwnerUserId: spaces.ownerUserId,
              memberRole: spaceMembers.role,
            })
            .from(contentItems)
            .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
            .leftJoin(
              spaceMembers,
              and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, currentUser.id)),
            )
            .where(
              and(
                eq(contentItems.status, 'published'),
                or(
                  ilike(contentItems.title, pattern),
                  ilike(contentItems.summary, pattern),
                ),
              ),
            )
            .orderBy(desc(contentItems.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP * 3)
        : db
            .select({
              id: contentItems.id,
              title: contentItems.title,
              summary: contentItems.summary,
              format: contentItems.format,
              visibility: contentItems.visibility,
              updatedAt: contentItems.updatedAt,
              spaceId: contentItems.spaceId,
              spaceVisibility: spaces.visibility,
              spaceJoinPolicy: spaces.joinPolicy,
              spaceOwnerUserId: spaces.ownerUserId,
            })
            .from(contentItems)
            .innerJoin(spaces, eq(spaces.id, contentItems.spaceId))
            .where(
              and(
                eq(contentItems.status, 'published'),
                or(
                  ilike(contentItems.title, pattern),
                  ilike(contentItems.summary, pattern),
                ),
              ),
            )
            .orderBy(desc(contentItems.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP * 3)
            .then((rows) =>
              rows.map((row) => ({
                ...row,
                memberRole: null as null,
              })),
            )
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
      posts: postRows
        .filter((row) =>
          canReadContent(
            principal,
            {
              visibility: row.spaceVisibility,
              joinPolicy: row.spaceJoinPolicy,
              ownerUserId: row.spaceOwnerUserId,
              memberRole: row.memberRole,
            },
            row.visibility,
          ),
        )
        .slice(0, MAX_RESULTS_PER_GROUP)
        .map((row) => ({
          id: row.id,
          label: row.title ?? `Post ${row.id}`,
          subtitle: row.summary
            ? `${row.format.replace('_', ' ')} · ${row.summary}`
            : row.format.replace('_', ' '),
          href: `/dashboard/content/${encodeURIComponent(row.id)}`,
        })),
    };

    return ok(response);
  } catch (error) {
    console.error('Failed to search global portal content', error);
    return serverError('Failed to search portal content');
  }
}
