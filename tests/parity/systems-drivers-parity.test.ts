import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../../lib/db/prisma';
import { drizzleSystemsDriver } from '../../lib/server/drivers/drizzle-systems-driver';
import { prismaSystemsDriver } from '../../lib/server/drivers/prisma-systems-driver';
import { createEntityId } from '../../lib/server/utils/id';

function normalizeSystemList(
  systems: Awaited<ReturnType<typeof prismaSystemsDriver.listSystemsForUser>>,
): Array<{
  id: string;
  title: string;
  description: string | null;
  schemaVersion: number;
  revision: number;
  role: 'owner' | 'editor' | 'viewer';
}> {
  return systems
    .map((system) => ({
      id: system.id,
      title: system.title,
      description: system.description,
      schemaVersion: system.schemaVersion,
      revision: system.revision,
      role: system.role,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const testIfDb = process.env.DATABASE_URL ? test : test.skip;

testIfDb('systems drivers parity on read paths', async () => {
  const ownerId = createEntityId('usr');
  const viewerId = createEntityId('usr');
  const systemId = createEntityId('sys');
  const nodeId = createEntityId('node');
  const shareId = createEntityId('share');

  await prisma.user.createMany({
    data: [
      { id: ownerId, email: `${ownerId}@example.test`, displayName: 'Owner' },
      { id: viewerId, email: `${viewerId}@example.test`, displayName: 'Viewer' },
    ],
  });

  try {
    await prisma.biddingSystem.create({
      data: {
        id: systemId,
        ownerId,
        updatedById: ownerId,
        title: 'Parity Read',
        description: 'Read parity baseline',
        schemaVersion: 1,
        revision: 1,
      },
    });

    await prisma.biddingNode.create({
      data: {
        id: nodeId,
        systemId,
        sequenceId: '1C-1D',
        payload: { sequence: '1C-1D', forcing: 'NF' },
        updatedById: ownerId,
      },
    });

    await prisma.systemShare.create({
      data: {
        id: shareId,
        systemId,
        userId: viewerId,
        role: 'viewer',
      },
    });

    const [prismaAccess, drizzleAccess] = await Promise.all([
      prismaSystemsDriver.resolveSystemAccess(systemId, viewerId),
      drizzleSystemsDriver.resolveSystemAccess(systemId, viewerId),
    ]);
    assert.deepEqual(drizzleAccess, prismaAccess);

    const [prismaList, drizzleList] = await Promise.all([
      prismaSystemsDriver.listSystemsForUser(viewerId),
      drizzleSystemsDriver.listSystemsForUser(viewerId),
    ]);
    assert.deepEqual(normalizeSystemList(drizzleList), normalizeSystemList(prismaList));

    const [prismaSystem, drizzleSystem] = await Promise.all([
      prismaSystemsDriver.getSystemForUser(systemId, viewerId),
      drizzleSystemsDriver.getSystemForUser(systemId, viewerId),
    ]);
    assert.deepEqual(
      {
        title: drizzleSystem.title,
        description: drizzleSystem.description,
        schemaVersion: drizzleSystem.schemaVersion,
        revision: drizzleSystem.revision,
        role: drizzleSystem.role,
        nodes: drizzleSystem.nodes.map((node) => ({
          sequenceId: node.sequenceId,
          payload: node.payload,
        })),
      },
      {
        title: prismaSystem.title,
        description: prismaSystem.description,
        schemaVersion: prismaSystem.schemaVersion,
        revision: prismaSystem.revision,
        role: prismaSystem.role,
        nodes: prismaSystem.nodes.map((node) => ({
          sequenceId: node.sequenceId,
          payload: node.payload,
        })),
      },
    );
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, viewerId] } },
    });
  }
});

testIfDb('systems drivers parity on mutations', async () => {
  const ownerId = createEntityId('usr');
  const editorId = createEntityId('usr');
  await prisma.user.createMany({
    data: [
      { id: ownerId, email: `${ownerId}@example.test`, displayName: 'Owner' },
      { id: editorId, email: `${editorId}@example.test`, displayName: 'Editor' },
    ],
  });

  try {
    const prismaCreated = await prismaSystemsDriver.createSystemForUser(ownerId, {
      title: 'Parity Prisma',
      description: 'Prisma path',
    });
    const drizzleCreated = await drizzleSystemsDriver.createSystemForUser(ownerId, {
      title: 'Parity Drizzle',
      description: 'Drizzle path',
    });

    assert.equal(prismaCreated.role, drizzleCreated.role);
    assert.equal(prismaCreated.schemaVersion, drizzleCreated.schemaVersion);
    assert.equal(prismaCreated.revision, drizzleCreated.revision);

    const prismaUpdated = await prismaSystemsDriver.updateSystemMetadata(prismaCreated.id, ownerId, {
      title: 'Updated title',
      description: 'Updated description',
      schemaVersion: 2,
    });
    const drizzleUpdated = await drizzleSystemsDriver.updateSystemMetadata(drizzleCreated.id, ownerId, {
      title: 'Updated title',
      description: 'Updated description',
      schemaVersion: 2,
    });

    assert.deepEqual(
      {
        title: drizzleUpdated.title,
        description: drizzleUpdated.description,
        schemaVersion: drizzleUpdated.schemaVersion,
        revision: drizzleUpdated.revision,
      },
      {
        title: prismaUpdated.title,
        description: prismaUpdated.description,
        schemaVersion: prismaUpdated.schemaVersion,
        revision: prismaUpdated.revision,
      },
    );

    const nodeInput = {
      nodes: [{ sequenceId: '1C-1H', payload: { forcing: 'F1' } }],
      removeSequenceIds: [] as string[],
      baseRevision: 1,
    };

    const prismaNodesResult = await prismaSystemsDriver.upsertSystemNodes(
      prismaCreated.id,
      ownerId,
      nodeInput,
    );
    const drizzleNodesResult = await drizzleSystemsDriver.upsertSystemNodes(
      drizzleCreated.id,
      ownerId,
      nodeInput,
    );

    assert.deepEqual(drizzleNodesResult, prismaNodesResult);

    const prismaShare = await prismaSystemsDriver.upsertSystemShare(prismaCreated.id, ownerId, {
      role: 'editor',
      userId: editorId,
    });
    const drizzleShare = await drizzleSystemsDriver.upsertSystemShare(drizzleCreated.id, ownerId, {
      role: 'editor',
      userId: editorId,
    });

    assert.deepEqual(
      {
        role: drizzleShare.role,
        userId: drizzleShare.user.id,
      },
      {
        role: prismaShare.role,
        userId: prismaShare.user.id,
      },
    );
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, editorId] } },
    });
  }
});
