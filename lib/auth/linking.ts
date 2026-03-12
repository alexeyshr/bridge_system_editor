import { normalizeTelegramUsername, TelegramAuthPayload, verifyTelegramAuth } from '@/lib/auth/telegram';
import { db } from '@/lib/db/drizzle/client';
import { authAccounts, users } from '@/lib/db/drizzle/schema';
import { createEntityId } from '@/lib/server/utils/id';
import { and, eq } from 'drizzle-orm';

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
  const [existingLink] = await db
    .select({
      id: authAccounts.id,
      userId: authAccounts.userId,
    })
    .from(authAccounts)
    .where(
      and(eq(authAccounts.provider, 'telegram'), eq(authAccounts.providerAccountId, providerAccountId)),
    )
    .limit(1);

  if (existingLink && existingLink.userId !== userId) {
    throw new TelegramLinkConflictError();
  }

  const username = normalizeTelegramUsername(payload.username);
  const displayName = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() || null;

  await db.transaction(async (tx) => {
    if (!existingLink) {
      await tx.insert(authAccounts).values({
        id: createEntityId('acct'),
        userId,
        provider: 'telegram',
        providerAccountId,
        createdAt: new Date(),
      });
    }

    await tx
      .update(users)
      .set({
        telegramUsername: username ?? undefined,
        displayName: displayName ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });

  return {
    providerAccountId,
    telegramUsername: username,
  };
}

export async function unlinkTelegramIdentity(userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .delete(authAccounts)
      .where(and(eq(authAccounts.userId, userId), eq(authAccounts.provider, 'telegram')));

    await tx
      .update(users)
      .set({
        telegramUsername: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
}
