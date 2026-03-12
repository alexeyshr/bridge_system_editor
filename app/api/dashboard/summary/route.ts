import { and, asc, count, desc, gte, isNotNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle/client';
import {
  bridgesportCalendarTournaments,
  bridgesportPlayers,
  bridgesportRatingSnapshots,
  bridgesportTournaments,
} from '@/lib/db/drizzle/schema';
import type { DashboardSummaryResponse } from '@/lib/portal-dashboard';
import { ok } from '@/lib/server/api-response';

const UPCOMING_LIMIT = 5;
const TOP_PLAYERS_LIMIT = 5;

export const revalidate = 300;

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function emptyResponse(message?: string): DashboardSummaryResponse {
  return {
    ready: false,
    generatedAt: new Date().toISOString(),
    stats: {
      totalPlayers: 0,
      totalTournaments: 0,
      upcomingEventsCount: 0,
    },
    latestRating: null,
    upcoming: [],
    topPlayers: [],
    message,
  };
}

export async function GET() {
  const now = new Date();

  try {
    const [
      playersTotalRows,
      tournamentsTotalRows,
      upcomingRows,
      latestRatingRows,
      topPlayersRows,
    ] = await Promise.all([
      db.select({ total: count() }).from(bridgesportPlayers),
      db.select({ total: count() }).from(bridgesportTournaments),
      db
        .select({
          id: bridgesportCalendarTournaments.id,
          sourceTournamentId: bridgesportCalendarTournaments.sourceTournamentId,
          name: bridgesportCalendarTournaments.name,
          city: bridgesportCalendarTournaments.city,
          startDate: bridgesportCalendarTournaments.startDate,
          sourceUrl: bridgesportCalendarTournaments.sourceUrl,
        })
        .from(bridgesportCalendarTournaments)
        .where(gte(bridgesportCalendarTournaments.startDate, now))
        .orderBy(asc(bridgesportCalendarTournaments.startDate))
        .limit(UPCOMING_LIMIT),
      db
        .select({
          id: bridgesportRatingSnapshots.id,
          sourceRatingId: bridgesportRatingSnapshots.sourceRatingId,
          typeName: bridgesportRatingSnapshots.ratingTypeName,
          name: bridgesportRatingSnapshots.name,
          snapshotDate: bridgesportRatingSnapshots.snapshotDate,
        })
        .from(bridgesportRatingSnapshots)
        .where(isNotNull(bridgesportRatingSnapshots.snapshotDate))
        .orderBy(desc(bridgesportRatingSnapshots.snapshotDate))
        .limit(1),
      db
        .select({
          id: bridgesportPlayers.id,
          sourcePlayerId: bridgesportPlayers.sourcePlayerId,
          name: bridgesportPlayers.name,
          city: bridgesportPlayers.city,
          rating: bridgesportPlayers.rating,
        })
        .from(bridgesportPlayers)
        .where(and(isNotNull(bridgesportPlayers.rating), gte(bridgesportPlayers.rating, 1)))
        .orderBy(desc(bridgesportPlayers.rating))
        .limit(TOP_PLAYERS_LIMIT),
    ]);

    const totalPlayers = toNumber(playersTotalRows[0]?.total);
    const totalTournaments = toNumber(tournamentsTotalRows[0]?.total);
    const ready = totalPlayers > 0 || totalTournaments > 0;

    const response: DashboardSummaryResponse = {
      ready,
      generatedAt: new Date().toISOString(),
      stats: {
        totalPlayers,
        totalTournaments,
        upcomingEventsCount: upcomingRows.length,
      },
      latestRating: latestRatingRows[0]
        ? {
            id: latestRatingRows[0].id,
            sourceRatingId: latestRatingRows[0].sourceRatingId,
            typeName: latestRatingRows[0].typeName,
            name: latestRatingRows[0].name,
            snapshotDate: latestRatingRows[0].snapshotDate?.toISOString() ?? null,
          }
        : null,
      upcoming: upcomingRows.map((row) => ({
        id: row.id,
        sourceTournamentId: row.sourceTournamentId,
        name: row.name,
        city: row.city,
        startDate: row.startDate.toISOString(),
        sourceUrl: row.sourceUrl,
      })),
      topPlayers: topPlayersRows.map((row) => ({
        id: row.id,
        sourcePlayerId: row.sourcePlayerId,
        name: row.name,
        city: row.city,
        rating: row.rating,
      })),
      message: ready
        ? undefined
        : 'BridgeSport data is not loaded yet. Run DB migration and ingest script.',
    };

    return ok(response);
  } catch (error) {
    console.error('Failed to build dashboard summary', error);
    return ok(
      emptyResponse(
        'BridgeSport tables are not ready yet. If you use remote DB, run the app with tunnel: npm run dev:remote.',
      ),
    );
  }
}
