import { z } from 'zod';

export const discussionScopeSchema = z.enum(['system', 'node']);

export const listDiscussionThreadsSchema = z.object({
  scope: discussionScopeSchema.optional(),
  scopeNodeId: z.string().trim().min(1).optional(),
});

export const createDiscussionThreadSchema = z
  .object({
    scope: discussionScopeSchema,
    scopeNodeId: z.string().trim().min(1).optional(),
    title: z.string().trim().max(240).optional().nullable(),
    body: z.string().trim().min(1).max(4000),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'node' && !value.scopeNodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeNodeId'],
        message: 'scopeNodeId is required for node discussion thread',
      });
    }
  });

export const postDiscussionMessageSchema = z.object({
  threadId: z.string().trim().min(1),
  body: z.string().trim().min(1).max(4000),
});
