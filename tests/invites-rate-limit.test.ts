import assert from 'node:assert/strict';
import test from 'node:test';
import { clearRateLimitBuckets, checkRateLimit } from '../lib/server/rate-limit';
import { createInviteSchema } from '../lib/validation/invites';

test('invite schema validates channel-specific targets', () => {
  const email = createInviteSchema.safeParse({
    channel: 'email',
    role: 'viewer',
    targetEmail: 'a@example.com',
    expiresInHours: 24,
  });
  assert.equal(email.success, true);

  const internalMissing = createInviteSchema.safeParse({
    channel: 'internal',
    role: 'editor',
    expiresInHours: 24,
  });
  assert.equal(internalMissing.success, false);

  const telegram = createInviteSchema.safeParse({
    channel: 'telegram',
    role: 'reviewer',
    targetTelegramUsername: '@bridge_user',
    expiresInHours: 24,
  });
  assert.equal(telegram.success, true);
});

test('rate limiter blocks abusive invite creation burst', () => {
  clearRateLimitBuckets();
  const baseNow = 1_700_000_100_000;
  for (let i = 0; i < 20; i += 1) {
    const result = checkRateLimit('invite:create:user-1:sys-1', 20, 60_000, baseNow);
    assert.equal(result.allowed, true);
  }
  const blocked = checkRateLimit('invite:create:user-1:sys-1', 20, 60_000, baseNow);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds >= 1);
});
