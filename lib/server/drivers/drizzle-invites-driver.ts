import crypto from 'node:crypto';
import { normalizeTelegramUsername } from '@/lib/auth/telegram';
import { db } from '@/lib/db/drizzle/client';
import { biddingSystems, shareInvites, systemShares, users } from '@/lib/db/drizzle/schema';
import { recordAuditEvent } from '@/lib/server/audit-service';
import { AccessDeniedError, InvalidStateError, NotFoundError, UserLookupError } from '@/lib/server/domain-errors';
import { createEntityId } from '@/lib/server/utils/id';
import { and, desc, eq, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { InvitesDriver } from './types';

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function getWebInviteUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/invite/${token}`;
}

function getTelegramInviteUrl(token: string): string | null {
  const botName = process.env.TELEGRAM_BOT_NAME?.trim();
  if (!botName) return null;
  return `https://t.me/${botName}?start=invite_${token}`;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

async function markExpiredInvites(systemId?: string): Promise<void> {
  const now = new Date();
  if (systemId) {
    await db
      .update(shareInvites)
      .set({
        status: 'expired',
      })
      .where(
        and(
          eq(shareInvites.systemId, systemId),
          eq(shareInvites.status, 'pending'),
          lt(shareInvites.expiresAt, now),
        ),
      );
    return;
  }

  await db
    .update(shareInvites)
    .set({
      status: 'expired',
    })
    .where(and(eq(shareInvites.status, 'pending'), lt(shareInvites.expiresAt, now)));
}

async function assertInviteManagerAccess(systemId: string, userId: string): Promise<void> {
  const [system] = await db
    .select({
      ownerId: biddingSystems.ownerId,
    })
    .from(biddingSystems)
    .where(eq(biddingSystems.id, systemId))
    .limit(1);

  if (!system) throw new NotFoundError('System not found');
  if (system.ownerId === userId) return;

  const [share] = await db
    .select({
      role: systemShares.role,
    })
    .from(systemShares)
    .where(and(eq(systemShares.systemId, systemId), eq(systemShares.userId, userId)))
    .limit(1);

  if (share?.role !== 'editor') throw new AccessDeniedError();
}

export const drizzleInvitesDriver: InvitesDriver = {
  async listInvitesForSystem(systemId, ownerId) {
    await assertInviteManagerAccess(systemId, ownerId);
    await markExpiredInvites(systemId);

    const targetUser = alias(users, 'target_user');
    const acceptedBy = alias(users, 'accepted_by');

    const invites = await db
      .select({
        id: shareInvites.id,
        token: shareInvites.token,
        role: shareInvites.role,
        channel: shareInvites.channel,
        status: shareInvites.status,
        targetEmail: shareInvites.targetEmail,
        targetTelegramUsername: shareInvites.targetTelegramUsername,
        createdAt: shareInvites.createdAt,
        expiresAt: shareInvites.expiresAt,
        acceptedAt: shareInvites.acceptedAt,
        revokedAt: shareInvites.revokedAt,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetUserDisplayName: targetUser.displayName,
        targetUserTelegram: targetUser.telegramUsername,
        acceptedById: acceptedBy.id,
        acceptedByEmail: acceptedBy.email,
        acceptedByDisplayName: acceptedBy.displayName,
      })
      .from(shareInvites)
      .leftJoin(targetUser, eq(shareInvites.targetUserId, targetUser.id))
      .leftJoin(acceptedBy, eq(shareInvites.acceptedById, acceptedBy.id))
      .where(eq(shareInvites.systemId, systemId))
      .orderBy(desc(shareInvites.createdAt));

    return invites.map((invite) => ({
      id: invite.id,
      token: invite.token,
      role: invite.role,
      channel: invite.channel,
      status: invite.status,
      targetEmail: invite.targetEmail,
      targetTelegramUsername: invite.targetTelegramUsername,
      targetUser: invite.targetUserId
        ? {
            id: invite.targetUserId,
            email: invite.targetUserEmail,
            displayName: invite.targetUserDisplayName,
            telegramUsername: invite.targetUserTelegram,
          }
        : null,
      acceptedBy: invite.acceptedById
        ? {
            id: invite.acceptedById,
            email: invite.acceptedByEmail,
            displayName: invite.acceptedByDisplayName,
          }
        : null,
      createdAt: toIso(invite.createdAt) as string,
      expiresAt: toIso(invite.expiresAt) as string,
      acceptedAt: toIso(invite.acceptedAt),
      revokedAt: toIso(invite.revokedAt),
      webInviteUrl: getWebInviteUrl(invite.token),
      telegramInviteUrl: invite.channel === 'telegram' ? getTelegramInviteUrl(invite.token) : null,
    }));
  },

  async createInviteForSystem(systemId, ownerId, input) {
    await assertInviteManagerAccess(systemId, ownerId);
    await markExpiredInvites(systemId);

    const token = generateToken();
    const expiresAt = addHours(new Date(), input.expiresInHours);

    const targetUserId = input.targetUserId ?? null;
    const targetEmail = input.targetEmail?.trim().toLowerCase() ?? null;
    const targetTelegramUsername = normalizeTelegramUsername(input.targetTelegramUsername) ?? null;

    if (input.channel === 'internal') {
      if (!targetUserId) throw new UserLookupError('targetUserId is required');
      const [target] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);
      if (!target) throw new UserLookupError('Target user does not exist');
    }

    if (input.channel === 'email' && !targetEmail) {
      throw new UserLookupError('targetEmail is required');
    }

    if (input.channel === 'telegram' && !targetTelegramUsername) {
      throw new UserLookupError('targetTelegramUsername is required');
    }

    const id = createEntityId('invite');
    await db.insert(shareInvites).values({
      id,
      systemId,
      createdById: ownerId,
      role: input.role,
      channel: input.channel,
      targetUserId,
      targetEmail,
      targetTelegramUsername,
      token,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
    });

    await recordAuditEvent({
      systemId,
      actorUserId: ownerId,
      action: 'invite.create',
      targetType: 'invite',
      targetId: id,
      payload: {
        channel: input.channel,
        role: input.role,
      },
    });

    return {
      id,
      channel: input.channel,
      role: input.role,
      status: 'pending' as const,
      token,
      webInviteUrl: getWebInviteUrl(token),
      telegramInviteUrl: input.channel === 'telegram' ? getTelegramInviteUrl(token) : null,
      expiresAt: expiresAt.toISOString(),
      delivery: {
        status: 'queued' as const,
        channel: input.channel,
        message:
          input.channel === 'telegram'
            ? 'Send telegramInviteUrl to recipient via Telegram'
            : input.channel === 'email'
              ? 'Email transport is not configured yet; use webInviteUrl manually'
              : 'Internal invite created',
      },
    };
  },

  async revokeInviteForSystem(systemId, ownerId, inviteId) {
    await assertInviteManagerAccess(systemId, ownerId);
    await markExpiredInvites(systemId);

    const [invite] = await db
      .select({
        id: shareInvites.id,
        systemId: shareInvites.systemId,
        status: shareInvites.status,
      })
      .from(shareInvites)
      .where(and(eq(shareInvites.id, inviteId), eq(shareInvites.systemId, systemId)))
      .limit(1);
    if (!invite) throw new NotFoundError('Invite not found');
    if (invite.status !== 'pending') {
      throw new InvalidStateError('Only pending invite can be revoked');
    }

    const now = new Date();
    await db
      .update(shareInvites)
      .set({
        status: 'revoked',
        revokedAt: now,
      })
      .where(eq(shareInvites.id, invite.id));

    await recordAuditEvent({
      systemId,
      actorUserId: ownerId,
      action: 'invite.revoke',
      targetType: 'invite',
      targetId: invite.id,
    });

    return {
      id: invite.id,
      systemId: invite.systemId,
      status: 'revoked' as const,
      revokedAt: now.toISOString(),
    };
  },

  async acceptInviteToken(token, userId) {
    await markExpiredInvites();
    const [invite] = await db
      .select({
        id: shareInvites.id,
        systemId: shareInvites.systemId,
        role: shareInvites.role,
        status: shareInvites.status,
        expiresAt: shareInvites.expiresAt,
        revokedAt: shareInvites.revokedAt,
        targetUserId: shareInvites.targetUserId,
        targetEmail: shareInvites.targetEmail,
        targetTelegramUsername: shareInvites.targetTelegramUsername,
      })
      .from(shareInvites)
      .where(eq(shareInvites.token, token))
      .limit(1);

    if (!invite) throw new NotFoundError('Invite not found');
    if (invite.status !== 'pending') throw new AccessDeniedError();

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      await db
        .update(shareInvites)
        .set({ status: 'expired' })
        .where(eq(shareInvites.id, invite.id));
      throw new NotFoundError('Invite expired');
    }

    if (invite.targetUserId && invite.targetUserId !== userId) {
      throw new AccessDeniedError();
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        telegramUsername: users.telegramUsername,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new AccessDeniedError();

    if (invite.targetEmail && user.email?.toLowerCase() !== invite.targetEmail.toLowerCase()) {
      throw new AccessDeniedError();
    }

    if (invite.targetTelegramUsername) {
      const userTelegram = normalizeTelegramUsername(user.telegramUsername);
      if (userTelegram !== normalizeTelegramUsername(invite.targetTelegramUsername)) {
        throw new AccessDeniedError();
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(systemShares)
        .values({
          id: createEntityId('share'),
          systemId: invite.systemId,
          userId,
          role: invite.role,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [systemShares.systemId, systemShares.userId],
          set: {
            role: invite.role,
          },
        });

      await tx
        .update(shareInvites)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedById: userId,
          revokedAt: null,
        })
        .where(and(eq(shareInvites.id, invite.id), eq(shareInvites.status, 'pending')));
    });

    await recordAuditEvent({
      systemId: invite.systemId,
      actorUserId: userId,
      action: 'invite.accept',
      targetType: 'invite',
      targetId: invite.id,
      payload: {
        role: invite.role,
      },
    });

    return {
      systemId: invite.systemId,
      role: invite.role,
      status: 'accepted' as const,
    };
  },
};
