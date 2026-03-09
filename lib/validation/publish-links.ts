import { z } from 'zod';

export const createReadOnlyLinkSchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  label: z.string().trim().max(120).optional().nullable(),
  expiresInHours: z.number().int().min(1).max(24 * 30).optional().nullable(),
});

export const manageReadOnlyLinkSchema = z.object({
  linkId: z.string().trim().min(1),
});
