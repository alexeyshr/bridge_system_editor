import { z } from 'zod';
import { SYSTEM_TEMPLATE_IDS } from '@/lib/system-templates';

export const createSystemSchema = z.object({
  title: z.string().trim().min(1).max(120).default('Untitled system'),
  description: z.string().trim().max(2000).optional().nullable(),
  templateId: z.enum(SYSTEM_TEMPLATE_IDS).optional(),
});

export const listSystemsSchema = z.object({
  query: z.string().trim().max(120).optional(),
  access: z.enum(['all', 'owner', 'shared']).optional(),
  status: z.enum(['all', 'active', 'stale']).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
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
    role: z.enum(['viewer', 'reviewer', 'editor']),
  })
  .refine((value) => !!value.userId || !!value.email, {
    message: 'Either userId or email must be provided',
  });

export const publishSystemVersionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const createDraftFromVersionSchema = z.object({
  versionId: z.string().trim().min(1),
});

export const compareDraftWithVersionSchema = z.object({
  versionId: z.string().trim().min(1),
});

export const listTournamentBindingsSchema = z.object({
  tournamentId: z.string().trim().min(1).optional(),
});

export const upsertTournamentBindingSchema = z
  .object({
    tournamentId: z.string().trim().min(1),
    scopeType: z.enum(['global', 'pair', 'team']),
    scopeId: z.string().trim().min(1).optional(),
    versionId: z.string().trim().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.scopeType !== 'global' && !value.scopeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeId'],
        message: 'scopeId is required for pair/team scope',
      });
    }
  });

export const freezeTournamentBindingSchema = z.object({
  bindingId: z.string().trim().min(1),
});

export const removeTournamentBindingSchema = z.object({
  bindingId: z.string().trim().min(1),
});

export const freezeTournamentBindingsSchema = z.object({
  tournamentId: z.string().trim().min(1),
});
