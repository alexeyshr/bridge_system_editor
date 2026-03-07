import { prisma } from '@/lib/db/prisma';
import {
  AccessDeniedError,
  NotFoundError,
  RevisionConflictError,
  UserLookupError,
} from '@/lib/server/domain-errors';
import type { ShareRole, SystemsDriver } from './types';

export const prismaSystemsDriver: SystemsDriver = {
  async resolveSystemAccess(systemId, userId) {
    const system = await prisma.biddingSystem.findUnique({
      where: { id: systemId },
      select: {
        id: true,
        ownerId: true,
        shares: {
          where: { userId },
          take: 1,
          select: { role: true },
        },
      },
    });

    if (!system) return { role: 'none', systemExists: false };
    if (system.ownerId === userId) return { role: 'owner', systemExists: true };
    if (system.shares[0]?.role === 'editor') return { role: 'editor', systemExists: true };
    if (system.shares[0]?.role === 'viewer') return { role: 'viewer', systemExists: true };
    return { role: 'none', systemExists: true };
  },

  async listSystemsForUser(userId) {
    const systems = await prisma.biddingSystem.findMany({
      where: {
        OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        shares: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });

    return systems.map((system) => ({
      id: system.id,
      title: system.title,
      description: system.description,
      schemaVersion: system.schemaVersion,
      revision: system.revision,
      updatedAt: system.updatedAt.toISOString(),
      role: system.ownerId === userId ? 'owner' : (system.shares[0]?.role ?? 'viewer'),
    }));
  },

  async createSystemForUser(userId, input) {
    const system = await prisma.biddingSystem.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        ownerId: userId,
        updatedById: userId,
        schemaVersion: 1,
        revision: 1,
      },
    });

    return {
      id: system.id,
      title: system.title,
      description: system.description,
      schemaVersion: system.schemaVersion,
      revision: system.revision,
      role: 'owner' as const,
      createdAt: system.createdAt.toISOString(),
      updatedAt: system.updatedAt.toISOString(),
    };
  },

  async getSystemForUser(systemId, userId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role === 'none') throw new AccessDeniedError();

    const system = await prisma.biddingSystem.findUnique({
      where: { id: systemId },
      include: {
        nodes: {
          orderBy: { sequenceId: 'asc' },
        },
      },
    });

    if (!system) throw new NotFoundError('System not found');

    return {
      id: system.id,
      title: system.title,
      description: system.description,
      schemaVersion: system.schemaVersion,
      revision: system.revision,
      role: access.role,
      updatedAt: system.updatedAt.toISOString(),
      nodes: system.nodes.map((node) => ({
        sequenceId: node.sequenceId,
        payload: node.payload,
        updatedAt: node.updatedAt.toISOString(),
      })),
    };
  },

  async updateSystemMetadata(systemId, userId, input) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    const updated = await prisma.biddingSystem.update({
      where: { id: systemId },
      data: {
        title: input.title,
        description: input.description,
        schemaVersion: input.schemaVersion,
        updatedById: userId,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      schemaVersion: updated.schemaVersion,
      revision: updated.revision,
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async upsertSystemNodes(systemId, userId, input) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    return prisma.$transaction(async (tx) => {
      const current = await tx.biddingSystem.findUnique({
        where: { id: systemId },
        select: { revision: true },
      });

      if (!current) throw new NotFoundError('System not found');
      if (input.baseRevision && input.baseRevision !== current.revision) {
        throw new RevisionConflictError();
      }

      for (const node of input.nodes) {
        await tx.biddingNode.upsert({
          where: {
            systemId_sequenceId: {
              systemId,
              sequenceId: node.sequenceId,
            },
          },
          create: {
            systemId,
            sequenceId: node.sequenceId,
            payload: node.payload as object,
            updatedById: userId,
          },
          update: {
            payload: node.payload as object,
            updatedById: userId,
          },
        });
      }

      let removed = 0;
      if (input.removeSequenceIds && input.removeSequenceIds.length > 0) {
        const deleteResult = await tx.biddingNode.deleteMany({
          where: {
            systemId,
            sequenceId: { in: input.removeSequenceIds },
          },
        });
        removed = deleteResult.count;
      }

      const nextRevision = current.revision + 1;
      await tx.biddingSystem.update({
        where: { id: systemId },
        data: {
          revision: nextRevision,
          updatedById: userId,
        },
      });

      await tx.systemRevision.create({
        data: {
          systemId,
          revision: nextRevision,
          createdById: userId,
          diff: {
            upserted: input.nodes.length,
            removed,
          },
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

    const shares = await prisma.systemShare.findMany({
      where: { systemId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            telegramUsername: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((share) => ({
      id: share.id,
      role: share.role,
      createdAt: share.createdAt.toISOString(),
      user: share.user,
    }));
  },

  async upsertSystemShare(systemId, ownerId, input) {
    const access = await this.resolveSystemAccess(systemId, ownerId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role !== 'owner') throw new AccessDeniedError();

    let targetUserId = input.userId;
    if (!targetUserId && input.email) {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: { id: true },
      });
      if (!user) throw new UserLookupError('User with this email is not registered');
      targetUserId = user.id;
    }

    if (!targetUserId) throw new UserLookupError('No target user provided');

    const system = await prisma.biddingSystem.findUnique({
      where: { id: systemId },
      select: { ownerId: true },
    });
    if (!system) throw new NotFoundError('System not found');
    if (targetUserId === system.ownerId) {
      throw new UserLookupError('Owner already has full access');
    }

    const share = await prisma.systemShare.upsert({
      where: {
        systemId_userId: {
          systemId,
          userId: targetUserId,
        },
      },
      create: {
        systemId,
        userId: targetUserId,
        role: input.role as ShareRole,
      },
      update: {
        role: input.role as ShareRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            telegramUsername: true,
          },
        },
      },
    });

    return {
      id: share.id,
      role: share.role,
      user: share.user,
      createdAt: share.createdAt.toISOString(),
    };
  },
};
