import { db } from '@/lib/db/drizzle/client';
import {
  biddingNodes,
  biddingSystems,
  systemDrafts,
  systemRevisions,
  systemShares,
  systemVersions,
  tournamentSystemBindings,
  users,
} from '@/lib/db/drizzle/schema';
import { getSystemTemplateProfile, getSystemTemplateSeed } from '@/lib/system-templates';
import {
  AccessDeniedError,
  InvalidStateError,
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

function normalizeForStableStringify(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeForStableStringify(item));
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = normalizeForStableStringify((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableStringify(value));
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
    const templateProfile = input.templateId ? getSystemTemplateProfile(input.templateId) : null;
    const title = input.title.trim() || templateProfile?.defaultTitle || 'Untitled system';
    const description = input.description === undefined
      ? (templateProfile?.defaultDescription ?? null)
      : (input.description ?? null);
    const now = new Date();
    const id = createEntityId('sys');
    await db.insert(biddingSystems).values({
      id,
      ownerId: userId,
      title,
      description,
      schemaVersion: 1,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      updatedById: userId,
    });
    await db.insert(systemDrafts).values({
      id: createEntityId('draft'),
      systemId: id,
      baseVersionId: null,
      draftRevision: 1,
      updatedById: userId,
      createdAt: now,
      updatedAt: now,
    });

    const templateSeedNodes = input.templateId ? getSystemTemplateSeed(input.templateId) : [];
    if (templateSeedNodes.length > 0) {
      await db.insert(biddingNodes).values(
        templateSeedNodes.map((node) => ({
          id: createEntityId('node'),
          systemId: id,
          sequenceId: node.sequenceId,
          payload: node.payload,
          updatedById: userId,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    return {
      id,
      title,
      description,
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
      await tx
        .insert(systemDrafts)
        .values({
          id: createEntityId('draft'),
          systemId,
          baseVersionId: null,
          draftRevision: nextRevision,
          updatedById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [systemDrafts.systemId],
          set: {
            draftRevision: nextRevision,
            updatedById: userId,
            updatedAt: new Date(),
          },
        });

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

  async listSystemVersions(systemId, userId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role === 'none') throw new AccessDeniedError();

    const rows = await db
      .select({
        id: systemVersions.id,
        systemId: systemVersions.systemId,
        versionNumber: systemVersions.versionNumber,
        label: systemVersions.label,
        notes: systemVersions.notes,
        sourceRevision: systemVersions.sourceRevision,
        publishedAt: systemVersions.publishedAt,
        publishedById: users.id,
        publishedByEmail: users.email,
        publishedByDisplayName: users.displayName,
      })
      .from(systemVersions)
      .innerJoin(users, eq(systemVersions.publishedById, users.id))
      .where(eq(systemVersions.systemId, systemId))
      .orderBy(desc(systemVersions.versionNumber));

    return rows.map((row) => ({
      id: row.id,
      systemId: row.systemId,
      versionNumber: row.versionNumber,
      label: row.label,
      notes: row.notes,
      sourceRevision: row.sourceRevision,
      publishedAt: toIso(row.publishedAt),
      publishedBy: {
        id: row.publishedById,
        email: row.publishedByEmail,
        displayName: row.publishedByDisplayName,
      },
    }));
  },

  async publishSystemVersion(systemId, userId, input) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    return db.transaction(async (tx) => {
      const [system] = await tx
        .select({
          id: biddingSystems.id,
          title: biddingSystems.title,
          description: biddingSystems.description,
          schemaVersion: biddingSystems.schemaVersion,
          revision: biddingSystems.revision,
        })
        .from(biddingSystems)
        .where(eq(biddingSystems.id, systemId))
        .limit(1);
      if (!system) throw new NotFoundError('System not found');

      const [maxVersionRow] = await tx
        .select({
          maxVersion: sql<number>`coalesce(max(${systemVersions.versionNumber}), 0)`,
        })
        .from(systemVersions)
        .where(eq(systemVersions.systemId, systemId));
      const nextVersionNumber = (maxVersionRow?.maxVersion ?? 0) + 1;

      const nodes = await tx
        .select({
          sequenceId: biddingNodes.sequenceId,
          payload: biddingNodes.payload,
        })
        .from(biddingNodes)
        .where(eq(biddingNodes.systemId, systemId))
        .orderBy(biddingNodes.sequenceId);

      const snapshot = {
        system: {
          id: system.id,
          title: system.title,
          description: system.description,
          schemaVersion: system.schemaVersion,
          revision: system.revision,
        },
        nodes: nodes.map((node) => ({
          sequenceId: node.sequenceId,
          payload: node.payload,
        })),
      };

      const now = new Date();
      const versionId = createEntityId('ver');
      await tx.insert(systemVersions).values({
        id: versionId,
        systemId,
        versionNumber: nextVersionNumber,
        label: input.label?.trim() ? input.label.trim() : null,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        sourceRevision: system.revision,
        snapshot,
        publishedById: userId,
        publishedAt: now,
      });

      return {
        id: versionId,
        systemId,
        versionNumber: nextVersionNumber,
        label: input.label?.trim() ? input.label.trim() : null,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        sourceRevision: system.revision,
        publishedAt: now.toISOString(),
      };
    });
  },

  async createDraftFromVersion(systemId, userId, versionId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    return db.transaction(async (tx) => {
      const [system] = await tx
        .select({
          id: biddingSystems.id,
          revision: biddingSystems.revision,
          title: biddingSystems.title,
          description: biddingSystems.description,
          schemaVersion: biddingSystems.schemaVersion,
        })
        .from(biddingSystems)
        .where(eq(biddingSystems.id, systemId))
        .limit(1);
      if (!system) throw new NotFoundError('System not found');

      const [version] = await tx
        .select({
          id: systemVersions.id,
          versionNumber: systemVersions.versionNumber,
          snapshot: systemVersions.snapshot,
        })
        .from(systemVersions)
        .where(and(eq(systemVersions.id, versionId), eq(systemVersions.systemId, systemId)))
        .limit(1);
      if (!version) throw new NotFoundError('Version not found');

      const snapshotRoot = version.snapshot && typeof version.snapshot === 'object' && !Array.isArray(version.snapshot)
        ? (version.snapshot as Record<string, unknown>)
        : {};
      const snapshotSystemRaw = snapshotRoot.system;
      const snapshotSystem = snapshotSystemRaw && typeof snapshotSystemRaw === 'object' && !Array.isArray(snapshotSystemRaw)
        ? (snapshotSystemRaw as Record<string, unknown>)
        : {};
      const snapshotNodesRaw = Array.isArray(snapshotRoot.nodes) ? snapshotRoot.nodes : [];
      const snapshotNodes: Array<{ sequenceId: string; payload: unknown }> = [];
      for (const item of snapshotNodesRaw) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const row = item as Record<string, unknown>;
        if (typeof row.sequenceId !== 'string' || !row.sequenceId.trim()) continue;
        snapshotNodes.push({
          sequenceId: row.sequenceId.trim(),
          payload: row.payload ?? {},
        });
      }

      await tx.delete(biddingNodes).where(eq(biddingNodes.systemId, systemId));
      for (const node of snapshotNodes) {
        await tx.insert(biddingNodes).values({
          id: createEntityId('node'),
          systemId,
          sequenceId: node.sequenceId,
          payload: node.payload,
          updatedById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const nextRevision = system.revision + 1;
      await tx
        .update(biddingSystems)
        .set({
          title: typeof snapshotSystem.title === 'string' && snapshotSystem.title.trim()
            ? snapshotSystem.title.trim()
            : system.title,
          description: typeof snapshotSystem.description === 'string'
            ? snapshotSystem.description
            : system.description,
          schemaVersion: typeof snapshotSystem.schemaVersion === 'number'
            ? snapshotSystem.schemaVersion
            : system.schemaVersion,
          revision: nextRevision,
          updatedById: userId,
          updatedAt: new Date(),
        })
        .where(eq(biddingSystems.id, systemId));

      await tx
        .insert(systemDrafts)
        .values({
          id: createEntityId('draft'),
          systemId,
          baseVersionId: version.id,
          draftRevision: nextRevision,
          updatedById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [systemDrafts.systemId],
          set: {
            baseVersionId: version.id,
            draftRevision: nextRevision,
            updatedById: userId,
            updatedAt: new Date(),
          },
        });

      await tx.insert(systemRevisions).values({
        id: createEntityId('rev'),
        systemId,
        revision: nextRevision,
        createdById: userId,
        createdAt: new Date(),
        diff: {
          action: 'create_draft_from_version',
          versionId: version.id,
          versionNumber: version.versionNumber,
          restoredNodes: snapshotNodes.length,
        },
      });

      return {
        systemId,
        versionId: version.id,
        versionNumber: version.versionNumber,
        revision: nextRevision,
        restoredNodes: snapshotNodes.length,
      };
    });
  },

  async compareDraftWithVersion(systemId, userId, versionId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role === 'none') throw new AccessDeniedError();

    const [system] = await db
      .select({
        id: biddingSystems.id,
        revision: biddingSystems.revision,
      })
      .from(biddingSystems)
      .where(eq(biddingSystems.id, systemId))
      .limit(1);
    if (!system) throw new NotFoundError('System not found');

    const [version] = await db
      .select({
        id: systemVersions.id,
        versionNumber: systemVersions.versionNumber,
        sourceRevision: systemVersions.sourceRevision,
        snapshot: systemVersions.snapshot,
      })
      .from(systemVersions)
      .where(and(eq(systemVersions.id, versionId), eq(systemVersions.systemId, systemId)))
      .limit(1);
    if (!version) throw new NotFoundError('Version not found');

    const draftRows = await db
      .select({
        sequenceId: biddingNodes.sequenceId,
        payload: biddingNodes.payload,
      })
      .from(biddingNodes)
      .where(eq(biddingNodes.systemId, systemId));

    const snapshotRoot = version.snapshot && typeof version.snapshot === 'object' && !Array.isArray(version.snapshot)
      ? (version.snapshot as Record<string, unknown>)
      : {};
    const snapshotNodesRaw = Array.isArray(snapshotRoot.nodes) ? snapshotRoot.nodes : [];
    const versionNodes = new Map<string, unknown>();
    for (const item of snapshotNodesRaw) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      if (typeof row.sequenceId !== 'string' || !row.sequenceId.trim()) continue;
      versionNodes.set(row.sequenceId.trim(), row.payload ?? {});
    }

    const draftNodes = new Map<string, unknown>();
    for (const row of draftRows) {
      draftNodes.set(row.sequenceId, row.payload);
    }

    const addedSequenceIds: string[] = [];
    const removedSequenceIds: string[] = [];
    const changedSequenceIds: string[] = [];
    let unchanged = 0;

    for (const [sequenceId, draftPayload] of draftNodes) {
      if (!versionNodes.has(sequenceId)) {
        addedSequenceIds.push(sequenceId);
        continue;
      }
      const versionPayload = versionNodes.get(sequenceId);
      if (stableStringify(draftPayload) === stableStringify(versionPayload)) {
        unchanged += 1;
      } else {
        changedSequenceIds.push(sequenceId);
      }
    }

    for (const sequenceId of versionNodes.keys()) {
      if (!draftNodes.has(sequenceId)) removedSequenceIds.push(sequenceId);
    }

    addedSequenceIds.sort();
    removedSequenceIds.sort();
    changedSequenceIds.sort();

    return {
      systemId,
      draftRevision: system.revision,
      versionId: version.id,
      versionNumber: version.versionNumber,
      sourceRevision: version.sourceRevision,
      summary: {
        added: addedSequenceIds.length,
        removed: removedSequenceIds.length,
        changed: changedSequenceIds.length,
        unchanged,
      },
      addedSequenceIds,
      removedSequenceIds,
      changedSequenceIds,
    };
  },

  async listTournamentBindings(systemId, userId, input) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (access.role === 'none') throw new AccessDeniedError();

    const rows = await db
      .select({
        id: tournamentSystemBindings.id,
        tournamentId: tournamentSystemBindings.tournamentId,
        scopeType: tournamentSystemBindings.scopeType,
        scopeId: tournamentSystemBindings.scopeId,
        status: tournamentSystemBindings.status,
        systemId: tournamentSystemBindings.systemId,
        versionId: tournamentSystemBindings.versionId,
        versionNumber: systemVersions.versionNumber,
        boundAt: tournamentSystemBindings.boundAt,
        frozenAt: tournamentSystemBindings.frozenAt,
        updatedAt: tournamentSystemBindings.updatedAt,
      })
      .from(tournamentSystemBindings)
      .innerJoin(systemVersions, eq(tournamentSystemBindings.versionId, systemVersions.id))
      .where(
        input?.tournamentId
          ? and(
            eq(tournamentSystemBindings.systemId, systemId),
            eq(tournamentSystemBindings.tournamentId, input.tournamentId),
          )
          : eq(tournamentSystemBindings.systemId, systemId),
      )
      .orderBy(desc(tournamentSystemBindings.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      tournamentId: row.tournamentId,
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      status: row.status,
      systemId: row.systemId,
      versionId: row.versionId,
      versionNumber: row.versionNumber,
      boundAt: toIso(row.boundAt),
      frozenAt: row.frozenAt ? toIso(row.frozenAt) : null,
      updatedAt: toIso(row.updatedAt),
    }));
  },

  async upsertTournamentBinding(systemId, userId, input) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    const [version] = await db
      .select({
        id: systemVersions.id,
        versionNumber: systemVersions.versionNumber,
      })
      .from(systemVersions)
      .where(and(eq(systemVersions.id, input.versionId), eq(systemVersions.systemId, systemId)))
      .limit(1);
    if (!version) throw new NotFoundError('Version not found');

    const scopeIdNormalized = input.scopeType === 'global' ? '' : (input.scopeId?.trim() ?? '');
    if (input.scopeType !== 'global' && !scopeIdNormalized) {
      throw new UserLookupError('scopeId is required for pair/team scope');
    }

    const [existing] = await db
      .select({
        id: tournamentSystemBindings.id,
        status: tournamentSystemBindings.status,
      })
      .from(tournamentSystemBindings)
      .where(
        and(
          eq(tournamentSystemBindings.systemId, systemId),
          eq(tournamentSystemBindings.tournamentId, input.tournamentId),
          eq(tournamentSystemBindings.scopeType, input.scopeType),
          eq(tournamentSystemBindings.scopeId, scopeIdNormalized),
        ),
      )
      .limit(1);
    if (existing?.status === 'frozen') {
      throw new InvalidStateError('Cannot update a frozen binding');
    }

    const now = new Date();
    if (existing) {
      await db
        .update(tournamentSystemBindings)
        .set({
          versionId: input.versionId,
          status: 'active',
          boundById: userId,
          boundAt: now,
          frozenAt: null,
          updatedAt: now,
        })
        .where(eq(tournamentSystemBindings.id, existing.id));
    } else {
      await db.insert(tournamentSystemBindings).values({
        id: createEntityId('bind'),
        systemId,
        tournamentId: input.tournamentId,
        scopeType: input.scopeType,
        scopeId: scopeIdNormalized,
        versionId: input.versionId,
        status: 'active',
        boundById: userId,
        boundAt: now,
        frozenAt: null,
        updatedAt: now,
      });
    }

    const [binding] = await db
      .select({
        id: tournamentSystemBindings.id,
        tournamentId: tournamentSystemBindings.tournamentId,
        scopeType: tournamentSystemBindings.scopeType,
        scopeId: tournamentSystemBindings.scopeId,
        status: tournamentSystemBindings.status,
        systemId: tournamentSystemBindings.systemId,
        versionId: tournamentSystemBindings.versionId,
        versionNumber: systemVersions.versionNumber,
        boundAt: tournamentSystemBindings.boundAt,
        frozenAt: tournamentSystemBindings.frozenAt,
        updatedAt: tournamentSystemBindings.updatedAt,
      })
      .from(tournamentSystemBindings)
      .innerJoin(systemVersions, eq(tournamentSystemBindings.versionId, systemVersions.id))
      .where(
        and(
          eq(tournamentSystemBindings.systemId, systemId),
          eq(tournamentSystemBindings.tournamentId, input.tournamentId),
          eq(tournamentSystemBindings.scopeType, input.scopeType),
          eq(tournamentSystemBindings.scopeId, scopeIdNormalized),
        ),
      )
      .limit(1);
    if (!binding) throw new NotFoundError('Binding not found');

    return {
      id: binding.id,
      tournamentId: binding.tournamentId,
      scopeType: binding.scopeType,
      scopeId: binding.scopeId,
      status: binding.status,
      systemId: binding.systemId,
      versionId: binding.versionId,
      versionNumber: binding.versionNumber,
      boundAt: toIso(binding.boundAt),
      frozenAt: binding.frozenAt ? toIso(binding.frozenAt) : null,
      updatedAt: toIso(binding.updatedAt),
    };
  },

  async freezeTournamentBinding(systemId, userId, bindingId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    const [binding] = await db
      .select({
        id: tournamentSystemBindings.id,
        status: tournamentSystemBindings.status,
      })
      .from(tournamentSystemBindings)
      .where(and(eq(tournamentSystemBindings.id, bindingId), eq(tournamentSystemBindings.systemId, systemId)))
      .limit(1);
    if (!binding) throw new NotFoundError('Binding not found');
    if (binding.status === 'frozen') {
      throw new InvalidStateError('Binding is already frozen');
    }

    const now = new Date();
    const [updated] = await db
      .update(tournamentSystemBindings)
      .set({
        status: 'frozen',
        frozenAt: now,
        updatedAt: now,
      })
      .where(eq(tournamentSystemBindings.id, bindingId))
      .returning({
        id: tournamentSystemBindings.id,
        status: tournamentSystemBindings.status,
        frozenAt: tournamentSystemBindings.frozenAt,
        updatedAt: tournamentSystemBindings.updatedAt,
      });
    if (!updated || !updated.frozenAt) throw new NotFoundError('Binding not found');

    return {
      id: updated.id,
      status: 'frozen' as const,
      frozenAt: toIso(updated.frozenAt),
      updatedAt: toIso(updated.updatedAt),
    };
  },

  async removeTournamentBinding(systemId, userId, bindingId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    const [binding] = await db
      .select({
        id: tournamentSystemBindings.id,
        status: tournamentSystemBindings.status,
      })
      .from(tournamentSystemBindings)
      .where(and(eq(tournamentSystemBindings.id, bindingId), eq(tournamentSystemBindings.systemId, systemId)))
      .limit(1);
    if (!binding) throw new NotFoundError('Binding not found');
    if (binding.status === 'frozen') {
      throw new InvalidStateError('Cannot remove a frozen binding');
    }

    await db.delete(tournamentSystemBindings).where(eq(tournamentSystemBindings.id, bindingId));
    return {
      id: binding.id,
      removed: true as const,
    };
  },

  async freezeTournamentBindings(systemId, userId, tournamentId) {
    const access = await this.resolveSystemAccess(systemId, userId);
    if (!access.systemExists) throw new NotFoundError('System not found');
    if (!(access.role === 'owner' || access.role === 'editor')) throw new AccessDeniedError();

    const rows = await db
      .select({
        id: tournamentSystemBindings.id,
        status: tournamentSystemBindings.status,
      })
      .from(tournamentSystemBindings)
      .where(
        and(
          eq(tournamentSystemBindings.systemId, systemId),
          eq(tournamentSystemBindings.tournamentId, tournamentId),
        ),
      );
    if (rows.length === 0) {
      return {
        tournamentId,
        frozenCount: 0,
        alreadyFrozenCount: 0,
      };
    }

    const alreadyFrozenCount = rows.filter((row) => row.status === 'frozen').length;
    const now = new Date();
    const frozenRows = await db
      .update(tournamentSystemBindings)
      .set({
        status: 'frozen',
        frozenAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(tournamentSystemBindings.systemId, systemId),
          eq(tournamentSystemBindings.tournamentId, tournamentId),
          eq(tournamentSystemBindings.status, 'active'),
        ),
      )
      .returning({ id: tournamentSystemBindings.id });

    return {
      tournamentId,
      frozenCount: frozenRows.length,
      alreadyFrozenCount,
    };
  },
};
