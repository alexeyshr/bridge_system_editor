import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle/client';
import { users, bridgesportPlayers, contentItems, biddingSystems } from '@/lib/db/drizzle/schema';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { ok, unauthorized, serverError } from '@/lib/server/api-response';

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const [userRow] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        telegramUsername: users.telegramUsername,
        bridgesportPlayerId: users.bridgesportPlayerId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userRow) return serverError('User not found');

    // Get bridgesport player data if linked
    let player = null;
    if (userRow.bridgesportPlayerId) {
      const [p] = await db
        .select({
          sourcePlayerId: bridgesportPlayers.sourcePlayerId,
          name: bridgesportPlayers.name,
          city: bridgesportPlayers.city,
          rank: bridgesportPlayers.rank,
          rating: bridgesportPlayers.rating,
          ratingPosition: bridgesportPlayers.ratingPosition,
          maxRatingPosition: bridgesportPlayers.maxRatingPosition,
          prizePoints: bridgesportPlayers.prizePoints,
          masterPoints: bridgesportPlayers.masterPoints,
          onlineMasterPoints: bridgesportPlayers.onlineMasterPoints,
          gamblerNick: bridgesportPlayers.gamblerNick,
          bboNick: bridgesportPlayers.bboNick,
          club: bridgesportPlayers.club,
          tournamentsCount: bridgesportPlayers.tournamentsCount,
          profileUrl: bridgesportPlayers.profileUrl,
        })
        .from(bridgesportPlayers)
        .where(eq(bridgesportPlayers.sourcePlayerId, userRow.bridgesportPlayerId))
        .limit(1);
      player = p ?? null;
    }

    // Count published content
    const [contentCount] = await db
      .select({ total: count() })
      .from(contentItems)
      .where(and(eq(contentItems.authorUserId, user.id), eq(contentItems.status, 'published')));

    // Count bidding systems
    const [systemsCount] = await db
      .select({ total: count() })
      .from(biddingSystems)
      .where(eq(biddingSystems.ownerId, user.id));

    // Get recent published content
    const recentContent = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        format: contentItems.format,
        publishedAt: contentItems.publishedAt,
        coverImageUrl: contentItems.coverImageUrl,
      })
      .from(contentItems)
      .where(and(eq(contentItems.authorUserId, user.id), eq(contentItems.status, 'published')))
      .orderBy(desc(contentItems.publishedAt))
      .limit(5);

    // Get bidding systems
    const systems = await db
      .select({
        id: biddingSystems.id,
        title: biddingSystems.title,
        description: biddingSystems.description,
        updatedAt: biddingSystems.updatedAt,
      })
      .from(biddingSystems)
      .where(eq(biddingSystems.ownerId, user.id))
      .orderBy(desc(biddingSystems.updatedAt))
      .limit(5);

    return ok({
      user: {
        id: userRow.id,
        email: userRow.email,
        displayName: userRow.displayName,
        telegramUsername: userRow.telegramUsername,
        createdAt: userRow.createdAt?.toISOString() ?? null,
      },
      player,
      stats: {
        publishedContent: Number(contentCount?.total ?? 0),
        biddingSystems: Number(systemsCount?.total ?? 0),
        tournaments: player?.tournamentsCount ?? 0,
      },
      recentContent,
      systems,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return serverError('Failed to load profile');
  }
}
