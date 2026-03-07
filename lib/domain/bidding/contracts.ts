import { z } from 'zod';

export const biddingCallSchema = z
  .string()
  .trim()
  .regex(/^([1-7](C|D|H|S|NT)|Pass|X|XX)$/i, 'Invalid call format');

export const biddingSequenceSchema = z.array(biddingCallSchema).min(1, 'Sequence must contain at least one call');

const rangeValueSchema = z.union([z.number(), z.string()]);

export const hcpRangeSchema = z
  .object({
    min: rangeValueSchema.optional(),
    max: rangeValueSchema.optional(),
  })
  .partial();

export const shapeSchema = z
  .object({
    S: z.string().optional(),
    H: z.string().optional(),
    D: z.string().optional(),
    C: z.string().optional(),
    balanced: z.boolean().optional(),
    patterns: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
  })
  .partial();

export const commentSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  author: z.string().min(1),
  timestamp: z.string().optional(),
  parentId: z.string().optional(),
});

export const forcingCodeSchema = z.enum(['NF', 'INV', 'F1', 'FG', 'SL']);

export const biddingMeaningSchema = z
  .object({
    type: z.string().optional(),
    forcing: forcingCodeSchema.optional(),
    natural: z.boolean().optional(),
    alert: z.boolean().optional(),
    hcp: hcpRangeSchema.optional(),
    shape: shapeSchema.optional(),
    shows: z.array(z.string()).optional(),
    notes: z.string().optional(),
    accepted: z.boolean().optional(),
    comments: z.array(commentSchema).optional(),
  })
  .partial();

export const biddingNodeSchema = z
  .object({
    id: z.string().min(1),
    context: z.object({
      sequence: biddingSequenceSchema,
    }),
    meaning: biddingMeaningSchema.optional(),
    isExpanded: z.boolean().optional(),
    isBookmarked: z.boolean().optional(),
  })
  .superRefine((node, ctx) => {
    const canonicalId = node.context.sequence.join(' ');
    if (node.id !== canonicalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['id'],
        message: `Node id must equal sequence path '${canonicalId}'`,
      });
    }
  });

export const biddingNodesMapSchema = z.record(z.string(), biddingNodeSchema).superRefine((nodes, ctx) => {
  for (const [key, node] of Object.entries(nodes)) {
    if (key !== node.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `Record key '${key}' must match node id '${node.id}'`,
      });
    }
  }
});

export const systemAccessRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const biddingSystemSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  schemaVersion: z.number().int().min(1),
  revision: z.number().int().min(1),
  updatedAt: z.string().min(1),
  role: systemAccessRoleSchema,
});

export const biddingSystemSnapshotSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  schemaVersion: z.number().int().min(1),
  revision: z.number().int().min(1),
  role: systemAccessRoleSchema,
  updatedAt: z.string().min(1),
  nodes: z.array(
    z.object({
      sequenceId: z.string().min(1),
      payload: z.unknown(),
      updatedAt: z.string().min(1),
    }),
  ),
});

export const nodesSyncRequestSchema = z.object({
  nodes: z.array(
    z.object({
      sequenceId: z.string().min(1),
      payload: z.unknown(),
    }),
  ),
  removeSequenceIds: z.array(z.string().min(1)).optional(),
  baseRevision: z.number().int().min(1).optional(),
});

export type BiddingNodeContract = z.infer<typeof biddingNodeSchema>;
export type BiddingNodesMapContract = z.infer<typeof biddingNodesMapSchema>;
export type BiddingSystemSummaryContract = z.infer<typeof biddingSystemSummarySchema>;
export type BiddingSystemSnapshotContract = z.infer<typeof biddingSystemSnapshotSchema>;
export type NodesSyncRequestContract = z.infer<typeof nodesSyncRequestSchema>;
