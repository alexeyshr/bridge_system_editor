import { z } from 'zod';

const spaceSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const listSpacesSchema = z.object({
  query: z.string().trim().max(120).optional(),
});

export const createSpaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  slug: z.string().trim().min(2).max(191).regex(spaceSlugRegex).optional(),
  type: z.enum(['personal', 'team']).default('team'),
  visibility: z.enum(['public', 'hidden']).default('hidden'),
  joinPolicy: z.enum(['request', 'invite_only']).default('invite_only'),
  reviewPolicy: z.enum(['none', 'required']).default('none'),
});

export const updateSpaceSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    slug: z.string().trim().min(2).max(191).regex(spaceSlugRegex).optional(),
    visibility: z.enum(['public', 'hidden']).optional(),
    joinPolicy: z.enum(['request', 'invite_only']).optional(),
    reviewPolicy: z.enum(['none', 'required']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const createSpaceJoinRequestSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export const listSpaceJoinRequestsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export const listMySpaceJoinRequestsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export const reviewSpaceJoinRequestSchema = z.object({
  requestId: z.string().trim().min(1),
  decision: z.enum(['approve', 'reject']),
});

export const createSpaceInviteSchema = z
  .object({
    role: z.enum(['admin', 'editor', 'member']).default('member'),
    targetUserId: z.string().trim().min(1).optional(),
    targetEmail: z.string().trim().email().optional(),
    expiresInHours: z.number().int().min(1).max(24 * 30).default(24 * 3),
  })
  .refine((value) => !!value.targetUserId || !!value.targetEmail, {
    message: 'Either targetUserId or targetEmail must be provided',
  });

export const listSpaceInvitesSchema = z.object({
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']).optional(),
});

export const revokeSpaceInviteSchema = z.object({
  inviteId: z.string().trim().min(1),
});

export const acceptSpaceInviteSchema = z.object({
  token: z.string().trim().min(1),
});
