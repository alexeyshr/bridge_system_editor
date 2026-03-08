import { drizzleInvitesDriver } from '@/lib/server/drivers/drizzle-invites-driver';
import type { InviteChannel, ShareRole } from './drivers/types';

export async function listInvitesForSystem(systemId: string, ownerId: string) {
  return drizzleInvitesDriver.listInvitesForSystem(systemId, ownerId);
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
  return drizzleInvitesDriver.createInviteForSystem(systemId, ownerId, input);
}

export async function acceptInviteToken(token: string, userId: string) {
  return drizzleInvitesDriver.acceptInviteToken(token, userId);
}
