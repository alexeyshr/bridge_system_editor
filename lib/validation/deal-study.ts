import { z } from 'zod';

import { dealStudyDdSourceEnum, dealStudyPollScopeEnum } from '@/lib/db/drizzle/schema';

export const dealSeatSchema = z.enum(['W', 'N', 'E', 'S']);
export const dealSuitSchema = z.enum(['S', 'H', 'D', 'C']);
export const dealVulnerabilitySchema = z.enum(['none', 'ns', 'ew', 'all']);
export const contractDenominationSchema = z.enum(['C', 'D', 'H', 'S', 'NT']);
export const doubledStateSchema = z.enum(['none', 'X', 'XX']);

const rankPattern = /^[AKQJT98765432xX-]{0,26}$/;
const cardRankPattern = /^[AKQJT98765432]$/;

const seatHandSchema = z.object({
  S: z.string().trim().toUpperCase().max(26).regex(rankPattern),
  H: z.string().trim().toUpperCase().max(26).regex(rankPattern),
  D: z.string().trim().toUpperCase().max(26).regex(rankPattern),
  C: z.string().trim().toUpperCase().max(26).regex(rankPattern),
});

export const dealHandsSchema = z.object({
  W: seatHandSchema,
  N: seatHandSchema,
  E: seatHandSchema,
  S: seatHandSchema,
});

export const dealMaskSchema = z.object({
  hiddenSeats: z.array(dealSeatSchema).max(4).default([]),
  hiddenCards: z
    .array(
      z.object({
        seat: dealSeatSchema,
        suit: dealSuitSchema,
        rank: z.string().trim().toUpperCase().regex(cardRankPattern),
      }),
    )
    .max(52)
    .default([]),
});

export const auctionCallSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(8)
  .regex(/^([1-7](C|D|H|S|NT)|P|X|XX)$/);

export const playCardSchema = z.object({
  seat: dealSeatSchema,
  suit: dealSuitSchema,
  rank: z.string().trim().toUpperCase().regex(cardRankPattern),
});

export const playStepSchema = z.object({
  trickNo: z.number().int().min(1).max(13),
  leader: dealSeatSchema,
  cards: z.array(playCardSchema).min(1).max(4),
  winner: dealSeatSchema.nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

export const ddMatrixSchema = z.object({
  NS: z.object({
    C: z.number().int().min(0).max(13),
    D: z.number().int().min(0).max(13),
    H: z.number().int().min(0).max(13),
    S: z.number().int().min(0).max(13),
    NT: z.number().int().min(0).max(13),
  }),
  EW: z.object({
    C: z.number().int().min(0).max(13),
    D: z.number().int().min(0).max(13),
    H: z.number().int().min(0).max(13),
    S: z.number().int().min(0).max(13),
    NT: z.number().int().min(0).max(13),
  }),
});

export const ddParSchema = z.object({
  text: z.string().trim().max(240),
}).passthrough();

export const dealStudyDraftSchema = z.object({
  board: z.string().trim().max(64).nullable().optional(),
  dealer: dealSeatSchema,
  vulnerability: dealVulnerabilitySchema,
  contractLevel: z.number().int().min(1).max(7).nullable().optional(),
  contractDenom: contractDenominationSchema.nullable().optional(),
  declarer: dealSeatSchema.nullable().optional(),
  doubledState: doubledStateSchema.default('none'),
  resultDelta: z.number().int().min(-13).max(13).nullable().optional(),
  leadSuit: dealSuitSchema.nullable().optional(),
  leadRank: z.string().trim().toUpperCase().regex(cardRankPattern).nullable().optional(),
  hands: dealHandsSchema,
  visibilityMask: dealMaskSchema,
  auctionStartingSeat: dealSeatSchema,
  auctionSequence: z.array(auctionCallSchema).max(256),
  auctionNotes: z.string().trim().max(2000).nullable().optional(),
  narrativeMarkdown: z.string().max(100_000).default(''),
});

export const getDealStudySchema = z.object({
  contentId: z.string().trim().min(1),
});

export const upsertDealStudyDraftSchema = z.object({
  contentId: z.string().trim().min(1),
  data: dealStudyDraftSchema,
});

export const upsertDealStudyPlaySchema = z.object({
  contentId: z.string().trim().min(1),
  steps: z.array(playStepSchema).max(13),
});

export const upsertDealStudyDdSchema = z.object({
  contentId: z.string().trim().min(1),
  data: z.object({
    source: z.enum(dealStudyDdSourceEnum.enumValues),
    matrix: ddMatrixSchema,
    par: ddParSchema,
  }),
});

export const listDealStudyCommentsSchema = z.object({
  contentId: z.string().trim().min(1),
});

export const createDealStudyCommentSchema = z.object({
  contentId: z.string().trim().min(1),
  data: z.object({
    parentCommentId: z.string().trim().min(1).nullable().optional(),
    body: z.string().trim().min(1).max(10_000),
    anchor: z
      .object({
        type: z.enum(['auction', 'play', 'general']),
        ref: z.string().trim().max(120).optional(),
      })
      .nullable()
      .optional(),
  }),
});

export const createDealStudyPollSchema = z.object({
  contentId: z.string().trim().min(1),
  data: z.object({
    scope: z.enum(dealStudyPollScopeEnum.enumValues).default('general'),
    question: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
  }),
});

export const voteDealStudyPollSchema = z.object({
  contentId: z.string().trim().min(1),
  data: z.object({
    pollId: z.string().trim().min(1),
    optionId: z.string().trim().min(1),
  }),
});

export const closeDealStudyPollSchema = z.object({
  contentId: z.string().trim().min(1),
  data: z.object({
    pollId: z.string().trim().min(1),
    isClosed: z.boolean(),
  }),
});

export type DealStudyDraftInput = z.infer<typeof dealStudyDraftSchema>;
export type DealStudyPlayStepInput = z.infer<typeof playStepSchema>;
