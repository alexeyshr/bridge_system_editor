import { featureFlags } from '@/lib/config/feature-flags';
import { drizzleInvitesDriver } from '@/lib/server/drivers/drizzle-invites-driver';
import { prismaInvitesDriver } from '@/lib/server/drivers/prisma-invites-driver';
import type { InviteChannel, InvitesDriver, ShareRole } from './drivers/types';

function getInvitesDriver(): InvitesDriver {
  return featureFlags.dbDriver === 'drizzle' ? drizzleInvitesDriver : prismaInvitesDriver;
}

export async function listInvitesForSystem(systemId: string, ownerId: string) {
  return getInvitesDriver().listInvitesForSystem(systemId, ownerId);
}

export async function createInviteForSystem(
  systemId: string,
  ownerId: string,
  input: {
    channel: InviteChannel;
    role: ShareRole;
    targetEmail?: string;
    targetUserId?: string;
    targetTelegramUsername?: string;
    expiresInHours: number;
  },
) {
  return getInvitesDriver().createInviteForSystem(systemId, ownerId, input);
}

export async function acceptInviteToken(token: string, userId: string) {
  return getInvitesDriver().acceptInviteToken(token, userId);
}
