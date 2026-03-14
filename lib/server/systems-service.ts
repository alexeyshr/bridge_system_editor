import { canRoleAccessCapability, type CollaborationCapability } from '@/lib/server/collaboration-policy';
import { db } from '@/lib/db/drizzle/client';
import { biddingSystems, spaceMembers, spaces, type PortalGlobalRole } from '@/lib/db/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { recordAuditEvent } from '@/lib/server/audit-service';
import { drizzleSystemsDriver } from '@/lib/server/drivers/drizzle-systems-driver';
import { canSpaceCapability } from '@/lib/server/space-acl';
import { ensurePersonalSpaceForUser } from '@/lib/server/spaces-service';
import type { SystemTemplateId } from '@/lib/system-templates';
import { type SystemsHubFilterInput, filterSystemsForHub } from '@/lib/systems-hub';
import {
  listSystemTimeline,
  type SystemTimelineCategory,
  type SystemTimelineCursor,
} from './system-timeline-service';
import type { ResolvedAccess, ShareRole, TournamentBindingScope } from './drivers/types';

export {
  AccessDeniedError,
  InvalidStateError,
  NotFoundError,
  RateLimitError,
  RevisionConflictError,
  UserLookupError,
} from './domain-errors';
import { AccessDeniedError, NotFoundError } from './domain-errors';

export async function resolveSystemAccess(systemId: string, userId: string): Promise<ResolvedAccess> {
  return drizzleSystemsDriver.resolveSystemAccess(systemId, userId);
}

export async function assertSystemCapability(
  systemId: string,
  userId: string,
  capability: CollaborationCapability,
): Promise<ResolvedAccess['role']> {
  const access = await resolveSystemAccess(systemId, userId);
  if (!access.systemExists) throw new NotFoundError('System not found');
  if (!canRoleAccessCapability(access.role, capability)) throw new AccessDeniedError();
  return access.role;
}

export async function listSystemsForUser(userId: string, filters?: SystemsHubFilterInput) {
  const systems = await drizzleSystemsDriver.listSystemsForUser(userId);
  return filterSystemsForHub(systems, filters);
}

export async function createSystemForUser(
  userId: string,
  input: { title: string; description?: string | null; templateId?: SystemTemplateId },
) {
  const personalSpace = await ensurePersonalSpaceForUser(userId);
  const system = await drizzleSystemsDriver.createSystemForUser(userId, {
    ...input,
    spaceId: personalSpace.id,
    creatorUserId: userId,
  });
  await recordAuditEvent({
    systemId: system.id,
    actorUserId: userId,
    action: 'system.create',
    targetType: 'system',
    targetId: system.id,
    payload: {
      spaceId: system.spaceId,
      templateId: input.templateId ?? null,
    },
  });
  return system;
}

export async function getSystemForUser(systemId: string, userId: string) {
  return drizzleSystemsDriver.getSystemForUser(systemId, userId);
}

export async function updateSystemMetadata(
  systemId: string,
  userId: string,
  input: { title?: string; description?: string | null; schemaVersion?: number },
) {
  const system = await drizzleSystemsDriver.updateSystemMetadata(systemId, userId, input);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'system.update',
    targetType: 'system',
    targetId: systemId,
    payload: {
      title: input.title ?? null,
      description: typeof input.description === 'undefined' ? undefined : input.description,
      schemaVersion: input.schemaVersion ?? null,
      revision: system.revision,
    },
  });
  return system;
}

export async function upsertSystemNodes(
  systemId: string,
  userId: string,
  input: {
    nodes: Array<{ sequenceId: string; payload: unknown }>;
    removeSequenceIds?: string[];
    baseRevision?: number;
  },
) {
  const sync = await drizzleSystemsDriver.upsertSystemNodes(systemId, userId, input);
  const upsertedPreview = input.nodes.slice(0, 12).map((node) => node.sequenceId);
  const removedPreview = (input.removeSequenceIds ?? []).slice(0, 12);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'node.sync',
    targetType: 'system',
    targetId: systemId,
    payload: {
      revision: sync.revision,
      upserted: sync.upserted,
      removed: sync.removed,
      upsertedSequencesPreview: upsertedPreview,
      removedSequencesPreview: removedPreview,
      upsertedSequencesMore: Math.max(0, sync.upserted - upsertedPreview.length),
      removedSequencesMore: Math.max(0, sync.removed - removedPreview.length),
    },
  });
  return sync;
}

export async function listSystemShares(systemId: string, userId: string) {
  return drizzleSystemsDriver.listSystemShares(systemId, userId);
}

export async function upsertSystemShare(
  systemId: string,
  ownerId: string,
  input: { role: ShareRole; userId?: string; email?: string },
) {
  return drizzleSystemsDriver.upsertSystemShare(systemId, ownerId, input);
}

export async function listSystemVersions(systemId: string, userId: string) {
  return drizzleSystemsDriver.listSystemVersions(systemId, userId);
}

export async function publishSystemVersion(
  systemId: string,
  userId: string,
  input: { label?: string | null; notes?: string | null },
) {
  const version = await drizzleSystemsDriver.publishSystemVersion(systemId, userId, input);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'lifecycle.publish',
    targetType: 'system_version',
    targetId: version.id,
    payload: {
      versionNumber: version.versionNumber,
      sourceRevision: version.sourceRevision,
      label: version.label,
    },
  });
  return version;
}

export async function moveSystemToSpace(
  systemId: string,
  userId: string,
  targetSpaceId: string,
  globalRoles?: PortalGlobalRole[],
) {
  const [system] = await db
    .select({
      id: biddingSystems.id,
      ownerId: biddingSystems.ownerId,
      spaceId: biddingSystems.spaceId,
    })
    .from(biddingSystems)
    .where(eq(biddingSystems.id, systemId))
    .limit(1);
  if (!system) throw new NotFoundError('System not found');
  if (system.ownerId !== userId) throw new AccessDeniedError();

  const [targetSpace] = await db
    .select({
      id: spaces.id,
      visibility: spaces.visibility,
      joinPolicy: spaces.joinPolicy,
      ownerUserId: spaces.ownerUserId,
      memberRole: spaceMembers.role,
    })
    .from(spaces)
    .leftJoin(
      spaceMembers,
      and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, userId)),
    )
    .where(eq(spaces.id, targetSpaceId))
    .limit(1);
  if (!targetSpace) throw new NotFoundError('Target space not found');

  const subject = {
    userId,
    globalRoles: (globalRoles?.length ? globalRoles : ['user']) as PortalGlobalRole[],
  };
  const canWriteTarget = canSpaceCapability(subject, {
    visibility: targetSpace.visibility,
    joinPolicy: targetSpace.joinPolicy,
    ownerUserId: targetSpace.ownerUserId,
    memberRole: targetSpace.memberRole,
  }, 'space.system.write');

  if (!canWriteTarget) throw new AccessDeniedError();

  const moved = await drizzleSystemsDriver.moveSystemToSpace(systemId, userId, targetSpaceId);

  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'system.move_space',
    targetType: 'system',
    targetId: systemId,
    payload: {
      previousSpaceId: moved.previousSpaceId,
      targetSpaceId: moved.spaceId,
    },
  });

  return moved;
}

export async function createDraftFromVersion(systemId: string, userId: string, versionId: string) {
  const draft = await drizzleSystemsDriver.createDraftFromVersion(systemId, userId, versionId);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'lifecycle.draft_from_version',
    targetType: 'system_version',
    targetId: draft.versionId,
    payload: {
      versionNumber: draft.versionNumber,
      revision: draft.revision,
      restoredNodes: draft.restoredNodes,
    },
  });
  return draft;
}

export async function compareDraftWithVersion(systemId: string, userId: string, versionId: string) {
  return drizzleSystemsDriver.compareDraftWithVersion(systemId, userId, versionId);
}

export async function listTournamentBindings(
  systemId: string,
  userId: string,
  input?: { tournamentId?: string },
) {
  return drizzleSystemsDriver.listTournamentBindings(systemId, userId, input);
}

export async function upsertTournamentBinding(
  systemId: string,
  userId: string,
  input: {
    tournamentId: string;
    scopeType: TournamentBindingScope;
    scopeId?: string;
    versionId: string;
  },
) {
  const binding = await drizzleSystemsDriver.upsertTournamentBinding(systemId, userId, input);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'binding.upsert',
    targetType: 'tournament_binding',
    targetId: binding.id,
    payload: {
      tournamentId: binding.tournamentId,
      scopeType: binding.scopeType,
      scopeId: binding.scopeId,
      versionId: binding.versionId,
      versionNumber: binding.versionNumber,
      status: binding.status,
    },
  });
  return binding;
}

export async function freezeTournamentBinding(systemId: string, userId: string, bindingId: string) {
  const binding = await drizzleSystemsDriver.freezeTournamentBinding(systemId, userId, bindingId);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'binding.freeze',
    targetType: 'tournament_binding',
    targetId: binding.id,
    payload: {
      frozenAt: binding.frozenAt,
      status: binding.status,
    },
  });
  return binding;
}

export async function removeTournamentBinding(systemId: string, userId: string, bindingId: string) {
  const result = await drizzleSystemsDriver.removeTournamentBinding(systemId, userId, bindingId);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'binding.remove',
    targetType: 'tournament_binding',
    targetId: result.id,
    payload: {
      removed: result.removed,
    },
  });
  return result;
}

export async function freezeTournamentBindings(systemId: string, userId: string, tournamentId: string) {
  const result = await drizzleSystemsDriver.freezeTournamentBindings(systemId, userId, tournamentId);
  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'binding.freeze_tournament',
    targetType: 'tournament',
    targetId: tournamentId,
    payload: {
      tournamentId: result.tournamentId,
      frozenCount: result.frozenCount,
      alreadyFrozenCount: result.alreadyFrozenCount,
    },
  });
  return result;
}

export async function listSystemTimelineForUser(
  systemId: string,
  userId: string,
  input?: {
    limit?: number;
    windowDays?: number;
    categories?: SystemTimelineCategory[];
    cursor?: SystemTimelineCursor;
  },
) {
  return listSystemTimeline(systemId, userId, input);
}
