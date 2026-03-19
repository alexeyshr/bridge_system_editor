import { z } from 'zod';

import { contentFormatEnum, contentLinkTargetEnum, contentStatusEnum, contentVisibilityEnum } from '@/lib/db/drizzle/schema';

const textBlockSchema = z.object({
  type: z.literal('text'),
  markdown: z.string().trim().min(1).max(40_000),
});

const calloutBlockSchema = z.object({
  type: z.literal('callout'),
  tone: z.enum(['info', 'warning', 'success', 'danger']).default('info'),
  text: z.string().trim().min(1).max(2_000),
});

const dealHandSchema = z.object({
  spades: z.string().trim().max(32).optional(),
  hearts: z.string().trim().max(32).optional(),
  diamonds: z.string().trim().max(32).optional(),
  clubs: z.string().trim().max(32).optional(),
});

const dealHandOrLegacySchema = z.union([z.string().trim().max(128), dealHandSchema]);

const dealBlockSchema = z.object({
  type: z.literal('deal'),
  board: z.string().trim().max(64).optional(),
  dealer: z.enum(['N', 'E', 'S', 'W']).optional(),
  vulnerability: z.enum(['none', 'ns', 'ew', 'all']).optional(),
  sourceUrl: z.string().trim().url().max(2048).optional(),
  hands: z
    .object({
      north: dealHandOrLegacySchema.optional(),
      east: dealHandOrLegacySchema.optional(),
      south: dealHandOrLegacySchema.optional(),
      west: dealHandOrLegacySchema.optional(),
    })
    .optional(),
}).superRefine((value, ctx) => {
  const hands = value.hands;
  const hasSourceUrl = Boolean(value.sourceUrl?.trim());
  const hasHands = Boolean(
    hands && (hands.north || hands.east || hands.south || hands.west),
  );

  if (!hasSourceUrl && !hasHands) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Deal requires either hands data or source URL.',
      path: ['hands'],
    });
  }
});

const auctionBlockSchema = z.object({
  type: z.literal('auction'),
  startingSeat: z.enum(['W', 'N', 'E', 'S']).optional(),
  vulnerability: z.enum(['none', 'ns', 'ew', 'all']).optional(),
  sequence: z.array(z.string().trim().min(1).max(12)).min(1).max(200),
  annotations: z.record(z.coerce.string(), z.string().trim().max(500)).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

const questionBlockSchema = z.object({
  type: z.literal('question'),
  question: z.string().trim().min(1).max(2_000),
  options: z.array(z.string().trim().min(1).max(500)).max(12).optional(),
});

const answerBlockSchema = z.object({
  type: z.literal('answer'),
  text: z.string().trim().min(1).max(4_000),
});

const imageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string().trim().min(1).max(2048),
  alt: z.string().trim().max(200).optional(),
  caption: z.string().trim().max(500).optional(),
});

export const contentBlockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  calloutBlockSchema,
  dealBlockSchema,
  auctionBlockSchema,
  questionBlockSchema,
  answerBlockSchema,
  imageBlockSchema,
]);

export const contentBlocksSchema = z.array(contentBlockSchema).min(1).max(2_000);

export const contentTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-_ ]*[a-z0-9]$|^[a-z0-9]$/);

export const contentLinkSchema = z.object({
  targetType: z.enum(contentLinkTargetEnum.enumValues),
  targetId: z.string().trim().min(1).max(191).optional().nullable(),
  url: z.string().trim().url().max(2048).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.targetType === 'external' && !value.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'External links require url',
      path: ['url'],
    });
  }
  if (value.targetType !== 'external' && !value.targetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Internal links require targetId',
      path: ['targetId'],
    });
  }
});

export const createContentItemSchema = z.object({
  spaceId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(4_000).optional().nullable(),
  coverImageUrl: z.string().trim().max(2048).optional().nullable(),
  format: z.enum(contentFormatEnum.enumValues).default('article'),
  visibility: z.enum(contentVisibilityEnum.enumValues).default('members_only'),
  blocks: contentBlocksSchema,
  tags: z.array(contentTagSchema).max(50).optional(),
  links: z.array(contentLinkSchema).max(100).optional(),
});

export const updateContentDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    summary: z.string().trim().max(4_000).optional().nullable(),
    coverImageUrl: z.string().trim().max(2048).optional().nullable(),
    format: z.enum(contentFormatEnum.enumValues).optional(),
    visibility: z.enum(contentVisibilityEnum.enumValues).optional(),
    blocks: contentBlocksSchema.optional(),
    tags: z.array(contentTagSchema).max(50).optional(),
    links: z.array(contentLinkSchema).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const publishContentItemSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const archiveContentItemSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const unarchiveContentItemSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const hardDeleteContentItemSchema = z.object({
  confirm: z.literal(true),
});

export const listContentItemsSchema = z.object({
  spaceId: z.string().trim().min(1).optional(),
  query: z.string().trim().max(160).optional(),
  format: z.enum(contentFormatEnum.enumValues).optional(),
  visibility: z.enum(contentVisibilityEnum.enumValues).optional(),
  status: z.enum(contentStatusEnum.enumValues).optional(),
  limit: z.number().int().min(1).max(500).default(20).optional(),
});

export const listContentFeedSchema = z.object({
  query: z.string().trim().max(160).optional(),
  limit: z.number().int().min(1).max(50).default(12).optional(),
});

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ContentBlocks = z.infer<typeof contentBlocksSchema>;
export type ContentLinkInput = z.infer<typeof contentLinkSchema>;
