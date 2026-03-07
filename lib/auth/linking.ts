import { prisma } from '@/lib/db/prisma';
import { normalizeTelegramUsername, TelegramAuthPayload, verifyTelegramAuth } from '@/lib/auth/telegram';

export class TelegramLinkConflictError extends Error {
  constructor() {
    super('Telegram identity is already linked to another account');
  }
}

export class TelegramVerificationError extends Error {
  constructor() {
    super('Telegram verification failed');
  }
}

export async function linkTelegramIdentity(
  userId: string,
  payload: TelegramAuthPayload,
  botToken: string,
) {
  if (!verifyTelegramAuth(payload, botToken)) {
    throw new TelegramVerificationError();
  }

  const providerAccountId = payload.id;
  const existingLink = await prisma.authAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'telegram',
        providerAccountId,
      },
    },
  });

  if (existingLink && existingLink.userId !== userId) {
    throw new TelegramLinkConflictError();
  }

  const username = normalizeTelegramUsername(payload.username);
  const displayName = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() || null;

  await prisma.$transaction(async (tx) => {
    if (!existingLink) {
      await tx.authAccount.create({
        data: {
          userId,
          provider: 'telegram',
          providerAccountId,
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        telegramUsername: username ?? undefined,
        displayName: displayName ?? undefined,
      },
    });
  });

  return {
    providerAccountId,
    telegramUsername: username,
  };
}
