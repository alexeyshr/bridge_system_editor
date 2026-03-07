import crypto from 'node:crypto';
import { normalizeTelegramUsername } from '@/lib/auth/telegram';
import { prisma } from '@/lib/db/prisma';
import { AccessDeniedError, NotFoundError, UserLookupError } from '@/lib/server/domain-errors';
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

async function assertOwnerAccess(systemId: string, ownerId: string): Promise<void> {
  const system = await prisma.biddingSystem.findUnique({
    where: { id: systemId },
    select: { ownerId: true },
  });

  if (!system) throw new NotFoundError('System not found');
  if (system.ownerId !== ownerId) throw new AccessDeniedError();
}

export const prismaInvitesDriver: InvitesDriver = {
  async listInvitesForSystem(systemId, ownerId) {
    await assertOwnerAccess(systemId, ownerId);

    const invites = await prisma.shareInvite.findMany({
      where: { systemId },
      orderBy: { createdAt: 'desc' },
      include: {
        targetUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
            telegramUsername: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return invites.map((invite) => ({
      id: invite.id,
      token: invite.token,
      role: invite.role,
      channel: invite.channel,
      status: invite.status,
      targetEmail: invite.targetEmail,
      targetTelegramUsername: invite.targetTelegramUsername,
      targetUser: invite.targetUser,
      acceptedBy: invite.acceptedBy,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      webInviteUrl: getWebInviteUrl(invite.token),
      telegramInviteUrl: invite.channel === 'telegram' ? getTelegramInviteUrl(invite.token) : null,
    }));
  },

  async createInviteForSystem(systemId, ownerId, input) {
    await assertOwnerAccess(systemId, ownerId);

    const token = generateToken();
    const expiresAt = addHours(new Date(), input.expiresInHours);

    let targetUserId: string | null = input.targetUserId ?? null;
    const targetEmail = input.targetEmail?.trim().toLowerCase() ?? null;
    const targetTelegramUsername = normalizeTelegramUsername(input.targetTelegramUsername) ?? null;

    if (input.channel === 'internal') {
      if (!targetUserId) throw new UserLookupError('targetUserId is required');
      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      if (!target) throw new UserLookupError('Target user does not exist');
    }

    if (input.channel === 'email' && !targetEmail) {
      throw new UserLookupError('targetEmail is required');
    }

    if (input.channel === 'telegram' && !targetTelegramUsername) {
      throw new UserLookupError('targetTelegramUsername is required');
    }

    const invite = await prisma.shareInvite.create({
      data: {
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
      },
    });

    return {
      id: invite.id,
      channel: invite.channel,
      role: invite.role,
      status: invite.status,
      token: invite.token,
      webInviteUrl: getWebInviteUrl(invite.token),
      telegramInviteUrl: input.channel === 'telegram' ? getTelegramInviteUrl(invite.token) : null,
      expiresAt: invite.expiresAt.toISOString(),
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

  async acceptInviteToken(token, userId) {
    const invite = await prisma.shareInvite.findUnique({
      where: { token },
      include: {
        acceptedBy: {
          select: { id: true },
        },
        targetUser: {
          select: { id: true },
        },
      },
    });

    if (!invite) throw new NotFoundError('Invite not found');
    if (invite.status !== 'pending') throw new AccessDeniedError();

    if (invite.expiresAt.getTime() < Date.now()) {
      await prisma.shareInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      throw new NotFoundError('Invite expired');
    }

    if (invite.targetUserId && invite.targetUserId !== userId) {
      throw new AccessDeniedError();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, telegramUsername: true },
    });
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

    await prisma.$transaction(async (tx) => {
      await tx.systemShare.upsert({
        where: {
          systemId_userId: {
            systemId: invite.systemId,
            userId,
          },
        },
        create: {
          systemId: invite.systemId,
          userId,
          role: invite.role,
        },
        update: {
          role: invite.role,
        },
      });

      await tx.shareInvite.update({
        where: { id: invite.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedById: userId,
        },
      });
    });

    return {
      systemId: invite.systemId,
      role: invite.role,
      status: 'accepted' as const,
    };
  },
};
