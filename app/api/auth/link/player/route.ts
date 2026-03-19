import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle/client';
import { users, bridgesportPlayers } from '@/lib/db/drizzle/schema';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { ok, badRequest, unauthorized, serverError, conflict } from '@/lib/server/api-response';

type PlayerLinkState = {
  linked: boolean;
  playerId: number | null;
  playerName: string | null;
  city: string | null;
  rank: string | null;
  rating: number | null;
  profileUrl: string | null;
};

function notLinked(): PlayerLinkState {
  return { linked: false, playerId: null, playerName: null, city: null, rank: null, rating: null, profileUrl: null };
}

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const [row] = await db
      .select({ bridgesportPlayerId: users.bridgesportPlayerId })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!row?.bridgesportPlayerId) return ok(notLinked());

    const [player] = await db
      .select({
        sourcePlayerId: bridgesportPlayers.sourcePlayerId,
        name: bridgesportPlayers.name,
        city: bridgesportPlayers.city,
        rank: bridgesportPlayers.rank,
        rating: bridgesportPlayers.rating,
        profileUrl: bridgesportPlayers.profileUrl,
      })
      .from(bridgesportPlayers)
      .where(eq(bridgesportPlayers.sourcePlayerId, row.bridgesportPlayerId))
      .limit(1);

    if (!player) return ok(notLinked());

    return ok({
      linked: true,
      playerId: player.sourcePlayerId,
      playerName: player.name,
      city: player.city,
      rank: player.rank,
      rating: player.rating,
      profileUrl: player.profileUrl,
    } satisfies PlayerLinkState);
  } catch (error) {
    console.error('Player link GET error:', error);
    return serverError('Failed to load player link status');
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    const playerId = body?.playerId;
    if (!playerId || typeof playerId !== 'number') {
      return badRequest('playerId (number) is required');
    }

    // Check player exists
    const [player] = await db
      .select({
        sourcePlayerId: bridgesportPlayers.sourcePlayerId,
        name: bridgesportPlayers.name,
        city: bridgesportPlayers.city,
        rank: bridgesportPlayers.rank,
        rating: bridgesportPlayers.rating,
        profileUrl: bridgesportPlayers.profileUrl,
      })
      .from(bridgesportPlayers)
      .where(eq(bridgesportPlayers.sourcePlayerId, playerId))
      .limit(1);

    if (!player) return badRequest('Player not found');

    // Check not already linked to another user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.bridgesportPlayerId, playerId))
      .limit(1);

    if (existing && existing.id !== user.id) {
      return conflict('This player is already linked to another account');
    }

    // Link
    await db
      .update(users)
      .set({ bridgesportPlayerId: playerId, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return ok({
      linked: true,
      playerId: player.sourcePlayerId,
      playerName: player.name,
      city: player.city,
      rank: player.rank,
      rating: player.rating,
      profileUrl: player.profileUrl,
    } satisfies PlayerLinkState);
  } catch (error) {
    console.error('Player link POST error:', error);
    return serverError('Failed to link player');
  }
}

export async function DELETE() {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    await db
      .update(users)
      .set({ bridgesportPlayerId: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return ok(notLinked());
  } catch (error) {
    console.error('Player link DELETE error:', error);
    return serverError('Failed to unlink player');
  }
}
