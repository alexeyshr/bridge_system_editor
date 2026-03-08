import { drizzleSystemsDriver } from '@/lib/server/drivers/drizzle-systems-driver';
import { type SystemsHubFilterInput, filterSystemsForHub } from '@/lib/systems-hub';
import type { ResolvedAccess, ShareRole, TournamentBindingScope } from './drivers/types';

export { AccessDeniedError, InvalidStateError, NotFoundError, RevisionConflictError, UserLookupError } from './domain-errors';

export async function resolveSystemAccess(systemId: string, userId: string): Promise<ResolvedAccess> {
  return drizzleSystemsDriver.resolveSystemAccess(systemId, userId);
}

export async function listSystemsForUser(userId: string, filters?: SystemsHubFilterInput) {
  const systems = await drizzleSystemsDriver.listSystemsForUser(userId);
  return filterSystemsForHub(systems, filters);
}

export async function createSystemForUser(userId: string, input: { title: string; description?: string | null }) {
  return drizzleSystemsDriver.createSystemForUser(userId, input);
}

export async function getSystemForUser(systemId: string, userId: string) {
  return drizzleSystemsDriver.getSystemForUser(systemId, userId);
}

export async function updateSystemMetadata(
  systemId: string,
  userId: string,
  input: { title?: string; description?: string | null; schemaVersion?: number },
) {
  return drizzleSystemsDriver.updateSystemMetadata(systemId, userId, input);
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
  return drizzleSystemsDriver.upsertSystemNodes(systemId, userId, input);
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
  return drizzleSystemsDriver.publishSystemVersion(systemId, userId, input);
}

export async function createDraftFromVersion(systemId: string, userId: string, versionId: string) {
  return drizzleSystemsDriver.createDraftFromVersion(systemId, userId, versionId);
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
  return drizzleSystemsDriver.upsertTournamentBinding(systemId, userId, input);
}

export async function freezeTournamentBinding(systemId: string, userId: string, bindingId: string) {
  return drizzleSystemsDriver.freezeTournamentBinding(systemId, userId, bindingId);
}
