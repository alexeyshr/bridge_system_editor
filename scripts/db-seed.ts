import { count, eq } from 'drizzle-orm';
import { closeDrizzleConnection } from '../lib/db/drizzle/client';

const seedUserId = 'seed-user-demo';
const seedSystemId = 'seed-system-demo';
const seedTournamentId = 'demo';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const [{ db }, { biddingNodes, biddingSystems, userGlobalRoles, userScopedRoles, users }] = await Promise.all([
    import('../lib/db/drizzle/client'),
    import('../lib/db/drizzle/schema'),
  ]);

  const now = new Date();

  await db.insert(users).values({
    id: seedUserId,
    email: 'seed.demo@example.com',
    displayName: 'Seed Demo User',
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  await db.insert(biddingSystems).values({
    id: seedSystemId,
    ownerId: seedUserId,
    title: 'Seed 1C Starter',
    description: 'Sample bidding system for local development',
    schemaVersion: 1,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    updatedById: seedUserId,
  }).onConflictDoNothing();

  await db.insert(userGlobalRoles).values({
    id: 'seed-global-role-user',
    userId: seedUserId,
    role: 'user',
    createdAt: now,
  }).onConflictDoNothing();

  await db.insert(userScopedRoles).values({
    id: 'seed-scoped-role-organizer',
    userId: seedUserId,
    scopeType: 'tournament',
    scopeId: seedTournamentId,
    role: 'organizer',
    createdAt: now,
  }).onConflictDoNothing();

  await db.insert(biddingNodes).values([
    {
      id: 'seed-node-1c',
      systemId: seedSystemId,
      sequenceId: '1C',
      payload: {
        id: '1C',
        context: { sequence: ['1C'] },
        meaning: {
          type: 'opening',
          forcing: 'NF',
          hcp: { min: 12, max: 21 },
          notes: 'Seed opening node',
          accepted: true,
        },
      },
      createdAt: now,
      updatedAt: now,
      updatedById: seedUserId,
    },
    {
      id: 'seed-node-1c-1d',
      systemId: seedSystemId,
      sequenceId: '1C 1D',
      payload: {
        id: '1C 1D',
        context: { sequence: ['1C', '1D'] },
        meaning: {
          type: 'response',
          forcing: 'F1',
          hcp: { min: 5 },
          notes: 'Seed response node',
        },
      },
      createdAt: now,
      updatedAt: now,
      updatedById: seedUserId,
    },
    {
      id: 'seed-node-1c-1d-1h',
      systemId: seedSystemId,
      sequenceId: '1C 1D 1H',
      payload: {
        id: '1C 1D 1H',
        context: { sequence: ['1C', '1D', '1H'] },
        meaning: {
          type: 'rebid',
          forcing: 'NF',
          hcp: { min: 11, max: 16 },
          notes: 'Seed rebid node',
          accepted: true,
        },
      },
      createdAt: now,
      updatedAt: now,
      updatedById: seedUserId,
    },
  ]).onConflictDoNothing();

  const [{ total }] = await db
    .select({ total: count() })
    .from(biddingNodes)
    .where(eq(biddingNodes.systemId, seedSystemId));

  console.log(`Seed completed. System '${seedSystemId}' has ${total} node(s). Tournament scope '${seedTournamentId}' organizer role assigned.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDrizzleConnection();
  });
