import { drizzleSystemsDriver } from '@/lib/server/drivers/drizzle-systems-driver';
import type { ResolvedAccess, ShareRole } from './drivers/types';

export { AccessDeniedError, NotFoundError, RevisionConflictError, UserLookupError } from './domain-errors';

export async function resolveSystemAccess(systemId: string, userId: string): Promise<ResolvedAccess> {
  return drizzleSystemsDriver.resolveSystemAccess(systemId, userId);
}

export async function listSystemsForUser(userId: string) {
  return drizzleSystemsDriver.listSystemsForUser(userId);
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
