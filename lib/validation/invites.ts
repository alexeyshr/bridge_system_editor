import { z } from 'zod';

const inviteBaseSchema = z.object({
  channel: z.enum(['email', 'internal', 'telegram']),
  role: z.enum(['viewer', 'reviewer', 'editor']),
  targetEmail: z.string().trim().email().optional(),
  targetUserId: z.string().trim().min(1).optional(),
  targetTelegramUsername: z.string().trim().min(2).max(64).optional(),
  expiresInHours: z.number().int().min(1).max(24 * 30).default(72),
});

export const createInviteSchema = inviteBaseSchema.superRefine((value, ctx) => {
  if (value.channel === 'email' && !value.targetEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetEmail'],
      message: 'targetEmail is required for email channel',
    });
  }

  if (value.channel === 'internal' && !value.targetUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetUserId'],
      message: 'targetUserId is required for internal channel',
    });
  }

  if (value.channel === 'telegram' && !value.targetTelegramUsername) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetTelegramUsername'],
      message: 'targetTelegramUsername is required for telegram channel',
    });
  }
});

export const revokeInviteSchema = z.object({
  inviteId: z.string().trim().min(1),
});
