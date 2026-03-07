import { featureFlags } from '@/lib/config/feature-flags';
import { drizzleSystemsDriver } from '@/lib/server/drivers/drizzle-systems-driver';
import { prismaSystemsDriver } from '@/lib/server/drivers/prisma-systems-driver';
import type { ResolvedAccess, ShareRole, SystemsDriver } from './drivers/types';

export { AccessDeniedError, NotFoundError, RevisionConflictError, UserLookupError } from './domain-errors';

function getSystemsDriver(): SystemsDriver {
  return featureFlags.dbDriver === 'drizzle' ? drizzleSystemsDriver : prismaSystemsDriver;
}

export async function resolveSystemAccess(systemId: string, userId: string): Promise<ResolvedAccess> {
  return getSystemsDriver().resolveSystemAccess(systemId, userId);
}

export async function listSystemsForUser(userId: string) {
  return getSystemsDriver().listSystemsForUser(userId);
}

export async function createSystemForUser(userId: string, input: { title: string; description?: string | null }) {
  return getSystemsDriver().createSystemForUser(userId, input);
}

export async function getSystemForUser(systemId: string, userId: string) {
  return getSystemsDriver().getSystemForUser(systemId, userId);
}

export async function updateSystemMetadata(
  systemId: string,
  userId: string,
  input: { title?: string; description?: string | null; schemaVersion?: number },
) {
  return getSystemsDriver().updateSystemMetadata(systemId, userId, input);
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
  return getSystemsDriver().upsertSystemNodes(systemId, userId, input);
}

export async function listSystemShares(systemId: string, userId: string) {
  return getSystemsDriver().listSystemShares(systemId, userId);
}

export async function upsertSystemShare(
  systemId: string,
  ownerId: string,
  input: { role: ShareRole; userId?: string; email?: string },
) {
  return getSystemsDriver().upsertSystemShare(systemId, ownerId, input);
}
