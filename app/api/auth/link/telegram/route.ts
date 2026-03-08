import { linkTelegramIdentity, TelegramLinkConflictError, TelegramVerificationError } from '@/lib/auth/linking';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { badRequest, conflict, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { z } from 'zod';

const telegramLinkSchema = z.object({
  id: z.string().trim().min(1),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  username: z.string().trim().optional(),
  photo_url: z.string().trim().optional(),
  auth_date: z.string().trim().min(1),
  hash: z.string().trim().min(1),
});

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

    const result = await linkTelegramIdentity(user.id, parsed.data, botToken);
    return ok({
      linked: true,
      telegramUserId: result.providerAccountId,
      telegramUsername: result.telegramUsername,
    });
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
