import crypto from 'node:crypto';

export interface TelegramAuthPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

const TELEGRAM_MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

function buildDataCheckString(payload: TelegramAuthPayload): string {
  const pairs = Object.entries(payload)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null && `${value}`.length > 0)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);

  return pairs.join('\n');
}

export function verifyTelegramAuth(
  payload: TelegramAuthPayload,
  botToken: string,
  nowEpochSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!botToken) return false;
  if (!payload.hash || !payload.auth_date || !payload.id) return false;

  const authDate = Number(payload.auth_date);
  if (!Number.isFinite(authDate)) return false;

  if (nowEpochSeconds - authDate > TELEGRAM_MAX_AUTH_AGE_SECONDS) {
    return false;
  }

  const dataCheckString = buildDataCheckString(payload);
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const generatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return generatedHash === payload.hash;
}

export function normalizeTelegramUsername(username?: string | null): string | null {
  if (!username) return null;
  return username.replace(/^@/, '').trim().toLowerCase() || null;
}
