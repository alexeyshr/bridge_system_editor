import assert from 'node:assert/strict';
import test from 'node:test';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../lib/db/drizzle/client';
import { biddingNodes, biddingSystems, systemShares, users } from '../../lib/db/drizzle/schema';
import { drizzleSystemsDriver } from '../../lib/server/drivers/drizzle-systems-driver';
import { createEntityId } from '../../lib/server/utils/id';

const testIfDb = process.env.DATABASE_URL ? test : test.skip;

async function cleanupUsers(userIds: string[]) {
  if (userIds.length === 0) return;

  await db
    .delete(users)
    .where(inArray(users.id, userIds));
}

testIfDb('drizzle systems driver read path', async () => {
  const ownerId = createEntityId('usr');
  const viewerId = createEntityId('usr');
  const systemId = createEntityId('sys');
  const nodeId = createEntityId('node');
  const shareId = createEntityId('share');
  const now = new Date();

  await db.insert(users).values([
    { id: ownerId, email: `${ownerId}@example.test`, displayName: 'Owner', createdAt: now, updatedAt: now },
    { id: viewerId, email: `${viewerId}@example.test`, displayName: 'Viewer', createdAt: now, updatedAt: now },
  ]);

  try {
    await db.insert(biddingSystems).values({
      id: systemId,
      ownerId,
      updatedById: ownerId,
      title: 'Drizzle Read',
      description: 'Read baseline',
      schemaVersion: 1,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(biddingNodes).values({
      id: nodeId,
      systemId,
      sequenceId: '1C-1D',
      payload: { sequence: '1C-1D', forcing: 'NF' },
      updatedById: ownerId,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(systemShares).values({
      id: shareId,
      systemId,
      userId: viewerId,
      role: 'viewer',
      createdAt: now,
    });

    const access = await drizzleSystemsDriver.resolveSystemAccess(systemId, viewerId);
    assert.deepEqual(access, { role: 'viewer', systemExists: true });

    const list = await drizzleSystemsDriver.listSystemsForUser(viewerId);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, systemId);
    assert.equal(list[0]?.role, 'viewer');

    const system = await drizzleSystemsDriver.getSystemForUser(systemId, viewerId);
    assert.equal(system.id, systemId);
    assert.equal(system.role, 'viewer');
    assert.equal(system.nodes.length, 1);
    assert.equal(system.nodes[0]?.sequenceId, '1C-1D');
  } finally {
    await cleanupUsers([ownerId, viewerId]);
  }
});

testIfDb('drizzle systems driver mutation path', async () => {
  const ownerId = createEntityId('usr');
  const editorId = createEntityId('usr');
  const now = new Date();

  await db.insert(users).values([
    { id: ownerId, email: `${ownerId}@example.test`, displayName: 'Owner', createdAt: now, updatedAt: now },
    { id: editorId, email: `${editorId}@example.test`, displayName: 'Editor', createdAt: now, updatedAt: now },
  ]);

  try {
    const created = await drizzleSystemsDriver.createSystemForUser(ownerId, {
      title: 'Drizzle Mutation',
      description: 'Mutation baseline',
    });

    assert.equal(created.role, 'owner');
    assert.equal(created.revision, 1);
    assert.equal(created.schemaVersion, 1);

    const updated = await drizzleSystemsDriver.updateSystemMetadata(created.id, ownerId, {
      title: 'Updated title',
      description: 'Updated description',
      schemaVersion: 2,
    });

    assert.equal(updated.title, 'Updated title');
    assert.equal(updated.description, 'Updated description');
    assert.equal(updated.schemaVersion, 2);

    const sync = await drizzleSystemsDriver.upsertSystemNodes(created.id, ownerId, {
      nodes: [{ sequenceId: '1C-1H', payload: { forcing: 'F1' } }],
      baseRevision: 1,
      removeSequenceIds: [],
    });

    assert.deepEqual(sync, {
      revision: 2,
      upserted: 1,
      removed: 0,
    });

    const share = await drizzleSystemsDriver.upsertSystemShare(created.id, ownerId, {
      role: 'editor',
      userId: editorId,
    });

    assert.equal(share.role, 'editor');
    assert.equal(share.user.id, editorId);

    const shares = await drizzleSystemsDriver.listSystemShares(created.id, ownerId);
    assert.equal(shares.length, 1);
    assert.equal(shares[0]?.user.id, editorId);

    const [node] = await db
      .select({ sequenceId: biddingNodes.sequenceId })
      .from(biddingNodes)
      .where(and(eq(biddingNodes.systemId, created.id), eq(biddingNodes.sequenceId, '1C-1H')))
      .limit(1);

    assert.equal(node?.sequenceId, '1C-1H');
  } finally {
    await cleanupUsers([ownerId, editorId]);
  }
});

testIfDb('drizzle systems driver lifecycle and tournament bindings path', async () => {
  const ownerId = createEntityId('usr');
  const now = new Date();

  await db.insert(users).values([
    { id: ownerId, email: `${ownerId}@example.test`, displayName: 'Owner', createdAt: now, updatedAt: now },
  ]);

  try {
    const created = await drizzleSystemsDriver.createSystemForUser(ownerId, {
      title: 'Lifecycle baseline',
      description: 'Lifecycle',
    });

    await drizzleSystemsDriver.upsertSystemNodes(created.id, ownerId, {
      nodes: [{ sequenceId: '1C-1D', payload: { forcing: 'NF' } }],
      baseRevision: 1,
      removeSequenceIds: [],
    });

    const published = await drizzleSystemsDriver.publishSystemVersion(created.id, ownerId, {
      label: 'v1',
      notes: 'Initial publish',
    });
    assert.equal(published.systemId, created.id);
    assert.equal(published.versionNumber, 1);

    const versions = await drizzleSystemsDriver.listSystemVersions(created.id, ownerId);
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.id, published.id);

    const binding = await drizzleSystemsDriver.upsertTournamentBinding(created.id, ownerId, {
      tournamentId: 'tournament-1',
      scopeType: 'global',
      versionId: published.id,
    });
    assert.equal(binding.status, 'active');
    assert.equal(binding.versionId, published.id);

    const bindings = await drizzleSystemsDriver.listTournamentBindings(created.id, ownerId, {
      tournamentId: 'tournament-1',
    });
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0]?.id, binding.id);

    const frozen = await drizzleSystemsDriver.freezeTournamentBinding(created.id, ownerId, binding.id);
    assert.equal(frozen.status, 'frozen');

    await drizzleSystemsDriver.upsertSystemNodes(created.id, ownerId, {
      nodes: [{ sequenceId: '1C-1H', payload: { forcing: 'F1' } }],
      baseRevision: 2,
      removeSequenceIds: ['1C-1D'],
    });

    const comparison = await drizzleSystemsDriver.compareDraftWithVersion(created.id, ownerId, published.id);
    assert.equal(comparison.systemId, created.id);
    assert.equal(comparison.versionId, published.id);
    assert.equal(comparison.summary.added, 1);
    assert.equal(comparison.summary.removed, 1);
    assert.equal(comparison.summary.changed, 0);
    assert.deepEqual(comparison.addedSequenceIds, ['1C-1H']);
    assert.deepEqual(comparison.removedSequenceIds, ['1C-1D']);

    const restored = await drizzleSystemsDriver.createDraftFromVersion(created.id, ownerId, published.id);
    assert.equal(restored.versionId, published.id);
    assert.equal(restored.restoredNodes, 1);

    const system = await drizzleSystemsDriver.getSystemForUser(created.id, ownerId);
    assert.equal(system.nodes.length, 1);
    assert.equal(system.nodes[0]?.sequenceId, '1C-1D');
  } finally {
    await cleanupUsers([ownerId]);
  }
});
