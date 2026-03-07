import { ok } from '@/lib/server/api-response';

export async function GET() {
  const providers = [
    {
      id: 'credentials',
      name: 'Email and Password',
      enabled: true,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      enabled: !!process.env.TELEGRAM_BOT_TOKEN,
    },
  ];

  return ok({ providers });
}
