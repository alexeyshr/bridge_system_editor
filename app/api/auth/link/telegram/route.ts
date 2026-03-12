import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  linkTelegramIdentity,
  TelegramLinkConflictError,
  TelegramVerificationError,
  unlinkTelegramIdentity,
} from '@/lib/auth/linking';
import { db } from '@/lib/db/drizzle/client';
import { authAccounts, users } from '@/lib/db/drizzle/schema';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, conflict, ok, serverError, unauthorized } from '@/lib/server/api-response';

const telegramLinkSchema = z.object({
  id: z.string().trim().min(1),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  username: z.string().trim().optional(),
  photo_url: z.string().trim().optional(),
  auth_date: z.string().trim().min(1),
  hash: z.string().trim().min(1),
});

async function loadTelegramLinkState(userId: string) {
  const [linkedAccount] = await db
    .select({
      providerAccountId: authAccounts.providerAccountId,
    })
    .from(authAccounts)
    .where(and(eq(authAccounts.userId, userId), eq(authAccounts.provider, 'telegram')))
    .limit(1);

  const [userRow] = await db
    .select({
      telegramUsername: users.telegramUsername,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    linked: Boolean(linkedAccount),
    telegramUserId: linkedAccount?.providerAccountId ?? null,
    telegramUsername: userRow?.telegramUsername ?? null,
  };
}

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const state = await loadTelegramLinkState(user.id);
    return ok(state);
  } catch (error) {
    console.error('Failed to read Telegram link state', error);
    return serverError('Failed to load Telegram link status');
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  if (!botToken) return badRequest('Telegram bot token is not configured');

  try {
    const json = await request.json();
    const parsed = telegramLinkSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid Telegram payload', parsed.error.flatten());
    }

    await linkTelegramIdentity(user.id, parsed.data, botToken);
    const state = await loadTelegramLinkState(user.id);
    return ok(state);
  } catch (error) {
    if (error instanceof TelegramVerificationError) {
      return badRequest('Telegram verification failed');
    }
    if (error instanceof TelegramLinkConflictError) {
      return conflict(error.message);
    }
    console.error('Telegram link failed', error);
    return serverError('Failed to link Telegram account');
  }
}

export async function DELETE() {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    await unlinkTelegramIdentity(user.id);
    const state = await loadTelegramLinkState(user.id);
    return ok(state);
  } catch (error) {
    console.error('Telegram unlink failed', error);
    return serverError('Failed to unlink Telegram account');
  }
}
