import { db } from '@/lib/db/drizzle/client';
import {
  biddingNodes,
  biddingSystems,
  systemRevisions,
  systemShares,
  users,
} from '@/lib/db/drizzle/schema';
import {
  AccessDeniedError,
  NotFoundError,
  RevisionConflictError,
  UserLookupError,
} from '@/lib/server/domain-errors';
import { createEntityId } from '@/lib/server/utils/id';
import { and, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { SystemsDriver } from './types';

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export const drizzleSystemsDriver: SystemsDriver = {
  async resolveSystemAccess(systemId, userId) {
    const [system] = await db
      .select({
        ownerId: biddingSystems.ownerId,
      })
      .from(biddingSystems)
      .where(eq(biddingSystems.id, systemId))
      .limit(1);

    if (!system) return { role: 'none', systemExists: false };
    if (system.ownerId === userId) return { role: 'owner', systemExists: true };

    const [share] = await db
      .select({
        role: systemShares.role,
      })
      .from(systemShares)
      .where(and(eq(systemShares.systemId, systemId), eq(systemShares.userId, userId)))
      .limit(1);

    if (share?.role === 'editor') return { role: 'editor', systemExists: true };
    if (share?.role === 'viewer') return { role: 'viewer', systemExists: true };
    return { role: 'none', systemExists: true };
  },

  async listSystemsForUser(userId) {
    const rows = await db
      .select({
        id: biddingSystems.id,
        title: biddingSystems.title,
        description: biddingSystems.description,
        schemaVersion: biddingSystems.schemaVersion,
        revision: biddingSystems.revision,
        updatedAt: biddingSystems.updatedAt,
        ownerId: biddingSystems.ownerId,
        shareRole: systemShares.role,
      })
      .from(biddingSystems)
      .leftJoin(
        systemShares,
        and(eq(systemShares.systemId, biddingSystems.id), eq(systemShares.userId, userId)),
      )
      .where(or(eq(biddingSystems.ownerId, userId), isNotNull(systemShares.userId)))
      .orderBy(desc(biddingSystems.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      schemaVersion: row.schemaVersion,
      revision: row.revision,
      updatedAt: toIso(row.updatedAt),
      role: row.ownerId === userId ? 'owner' : (row.shareRole ?? 'viewer'),
    }));
  },

  async createSystemForUser(userId, input) {
    const now = new Date();
    const id = createEntityId('sys');
    await db.insert(biddingSystems).values({
      id,
      ownerId: userId,
      title: input.title,
      description: input.description ?? null,
      schemaVersion: 1,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      updatedById: userId,
    });

    return {
      id,
      title: input.title,
      description: input.description ?? null,
      schemaVersion: 1,
      revision: 1,
      role: 'owner' as const,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  },

  async getSystemForUser(systemId, userId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role === 'none') throw new AccessDeniedError();

    const [system] = await db
      .select({
        id: biddingSystems.id,
        title: biddingSystems.title,
        description: biddingSystems.description,
        schemaVersion: biddingSystems.schemaVersion,
        revision: biddingSystems.revision,
        updatedAt: biddingSystems.updatedAt,
      })
      .from(biddingSystems)
      .where(eq(biddingSystems.id, systemId))
      .limit(1);
    if (!system) throw new NotFoundError('System not found');

    const nodes = await db
      .select({
        sequenceId: biddingNodes.sequenceId,
        payload: biddingNodes.payload,
        updatedAt: biddingNodes.updatedAt,
      })
      .from(biddingNodes)
      .where(eq(biddingNodes.systemId, systemId))
      .orderBy(biddingNodes.sequenceId);

    return {
      id: system.id,
      title: system.title,
      description: system.description,
      schemaVersion: system.schemaVersion,
      revision: system.revision,
      role: access.role,
      updatedAt: toIso(system.updatedAt),
      nodes: nodes.map((node) => ({
        sequenceId: node.sequenceId,
        payload: node.payload,
        updatedAt: toIso(node.updatedAt),
      })),
    };
  },

  async updateSystemMetadata(systemId, userId, input) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    const [updated] = await db
      .update(biddingSystems)
      .set({
        title: input.title,
        description: input.description,
        schemaVersion: input.schemaVersion,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(biddingSystems.id, systemId))
      .returning({
        id: biddingSystems.id,
        title: biddingSystems.title,
        description: biddingSystems.description,
        schemaVersion: biddingSystems.schemaVersion,
        revision: biddingSystems.revision,
        updatedAt: biddingSystems.updatedAt,
      });

    if (!updated) throw new NotFoundError('System not found');

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      schemaVersion: updated.schemaVersion,
      revision: updated.revision,
      updatedAt: toIso(updated.updatedAt),
    };
  },

  async upsertSystemNodes(systemId, userId, input) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          revision: biddingSystems.revision,
        })
        .from(biddingSystems)
        .where(eq(biddingSystems.id, systemId))
        .limit(1);

      if (!current) throw new NotFoundError('System not found');
      if (input.baseRevision && input.baseRevision !== current.revision) {
        throw new RevisionConflictError();
      }

      for (const node of input.nodes) {
        await tx
          .insert(biddingNodes)
          .values({
            id: createEntityId('node'),
            systemId,
            sequenceId: node.sequenceId,
            payload: node.payload,
            updatedById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [biddingNodes.systemId, biddingNodes.sequenceId],
            set: {
              payload: node.payload,
              updatedById: userId,
              updatedAt: new Date(),
            },
          });
      }

      let removed = 0;
      if (input.removeSequenceIds && input.removeSequenceIds.length > 0) {
        const deleted = await tx
          .delete(biddingNodes)
          .where(
            and(
              eq(biddingNodes.systemId, systemId),
              inArray(biddingNodes.sequenceId, input.removeSequenceIds),
            ),
          )
          .returning({ id: biddingNodes.id });
        removed = deleted.length;
      }

      const nextRevision = current.revision + 1;
      await tx
        .update(biddingSystems)
        .set({
          revision: nextRevision,
          updatedById: userId,
          updatedAt: new Date(),
        })
        .where(eq(biddingSystems.id, systemId));

      await tx.insert(systemRevisions).values({
        id: createEntityId('rev'),
        systemId,
        revision: nextRevision,
        createdById: userId,
        createdAt: new Date(),
        diff: {
          upserted: input.nodes.length,
          removed,
        },
      });

      return {
        revision: nextRevision,
        upserted: input.nodes.length,
        removed,
      };
    });
  },

  async listSystemShares(systemId, userId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role !== 'owner') throw new AccessDeniedError();

    const rows = await db
      .select({
        id: systemShares.id,
        role: systemShares.role,
        createdAt: systemShares.createdAt,
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        telegramUsername: users.telegramUsername,
      })
      .from(systemShares)
      .innerJoin(users, eq(systemShares.userId, users.id))
      .where(eq(systemShares.systemId, systemId))
      .orderBy(desc(systemShares.createdAt));

    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      createdAt: toIso(row.createdAt),
      user: {
        id: row.userId,
        email: row.email,
        displayName: row.displayName,
        telegramUsername: row.telegramUsername,
      },
    }));
  },

  async upsertSystemShare(systemId, ownerId, input) {
    const access = await this.resolveSystemAccess(systemId, ownerId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role !== 'owner') throw new AccessDeniedError();

    let targetUserId = input.userId;
    if (!targetUserId && input.email) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${input.email.toLowerCase()}`)
        .limit(1);
      if (!user) throw new UserLookupError('User with this email is not registered');
      targetUserId = user.id;
    }

    if (!targetUserId) throw new UserLookupError('No target user provided');

    const [system] = await db
      .select({
        ownerId: biddingSystems.ownerId,
      })
      .from(biddingSystems)
      .where(eq(biddingSystems.id, systemId))
      .limit(1);
    if (!system) throw new NotFoundError('System not found');
    if (targetUserId === system.ownerId) {
      throw new UserLookupError('Owner already has full access');
    }

    await db
      .insert(systemShares)
      .values({
        id: createEntityId('share'),
        systemId,
        userId: targetUserId,
        role: input.role,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [systemShares.systemId, systemShares.userId],
        set: {
          role: input.role,
        },
      });

    const [share] = await db
      .select({
        id: systemShares.id,
        role: systemShares.role,
        createdAt: systemShares.createdAt,
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        telegramUsername: users.telegramUsername,
      })
      .from(systemShares)
      .innerJoin(users, eq(systemShares.userId, users.id))
      .where(and(eq(systemShares.systemId, systemId), eq(systemShares.userId, targetUserId)))
      .limit(1);

    if (!share) throw new NotFoundError('Share not found');

    return {
      id: share.id,
      role: share.role,
      createdAt: toIso(share.createdAt),
      user: {
        id: share.userId,
        email: share.email,
        displayName: share.displayName,
        telegramUsername: share.telegramUsername,
      },
    };
  },
};
