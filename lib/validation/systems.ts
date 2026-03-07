import { z } from 'zod';

export const createSystemSchema = z.object({
  title: z.string().trim().min(1).max(120).default('Untitled system'),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateSystemSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    schemaVersion: z.number().int().min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const nodePayloadSchema = z.object({
  sequenceId: z.string().trim().min(1).max(500),
  payload: z.unknown(),
});

export const upsertNodesSchema = z.object({
  nodes: z.array(nodePayloadSchema).min(1).max(5000),
  removeSequenceIds: z.array(z.string().trim().min(1).max(500)).optional(),
  baseRevision: z.number().int().min(1).optional(),
});

export const upsertShareSchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    role: z.enum(['viewer', 'editor']),
  })
  .refine((value) => !!value.userId || !!value.email, {
    message: 'Either userId or email must be provided',
  });
