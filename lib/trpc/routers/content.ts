import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { protectedProcedure, publicProcedure, router } from '../init';
import {
  archiveContentItem,
  createContentItem,
  getContentItem,
  hardDeleteContentItem,
  listContentFeedForActor,
  listContentItemsForActor,
  publishContentItem,
  unarchiveContentItem,
  updateContentDraft,
} from '@/lib/server/content-service';
import {
  closeDealStudyPoll,
  createDealStudyComment,
  createDealStudyPoll,
  getDealStudy,
  listDealStudyComments,
  upsertDealStudyDdSnapshot,
  upsertDealStudyDraft,
  upsertDealStudyPlaySteps,
  voteDealStudyPoll,
} from '@/lib/server/deal-study-service';
import {
  archiveContentItemSchema,
  createContentItemSchema,
  hardDeleteContentItemSchema,
  listContentFeedSchema,
  listContentItemsSchema,
  publishContentItemSchema,
  unarchiveContentItemSchema,
  updateContentDraftSchema,
} from '@/lib/validation/content';
import {
  closeDealStudyPollSchema,
  createDealStudyCommentSchema,
  createDealStudyPollSchema,
  getDealStudySchema,
  listDealStudyCommentsSchema,
  upsertDealStudyDdSchema,
  upsertDealStudyDraftSchema,
  upsertDealStudyPlaySchema,
  voteDealStudyPollSchema,
} from '@/lib/validation/deal-study';
import { AccessDeniedError, InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';

export interface ContentRouterDeps {
  listContentItemsForActor: typeof listContentItemsForActor;
  listContentFeedForActor: typeof listContentFeedForActor;
  getContentItem: typeof getContentItem;
  createContentItem: typeof createContentItem;
  updateContentDraft: typeof updateContentDraft;
  publishContentItem: typeof publishContentItem;
  archiveContentItem: typeof archiveContentItem;
  unarchiveContentItem: typeof unarchiveContentItem;
  hardDeleteContentItem: typeof hardDeleteContentItem;
  getDealStudy: typeof getDealStudy;
  upsertDealStudyDraft: typeof upsertDealStudyDraft;
  upsertDealStudyPlaySteps: typeof upsertDealStudyPlaySteps;
  upsertDealStudyDdSnapshot: typeof upsertDealStudyDdSnapshot;
  listDealStudyComments: typeof listDealStudyComments;
  createDealStudyComment: typeof createDealStudyComment;
  createDealStudyPoll: typeof createDealStudyPoll;
  voteDealStudyPoll: typeof voteDealStudyPoll;
  closeDealStudyPoll: typeof closeDealStudyPoll;
}

const defaultDeps: ContentRouterDeps = {
  listContentItemsForActor,
  listContentFeedForActor,
  getContentItem,
  createContentItem,
  updateContentDraft,
  publishContentItem,
  archiveContentItem,
  unarchiveContentItem,
  hardDeleteContentItem,
  getDealStudy,
  upsertDealStudyDraft,
  upsertDealStudyPlaySteps,
  upsertDealStudyDdSnapshot,
  listDealStudyComments,
  createDealStudyComment,
  createDealStudyPoll,
  voteDealStudyPoll,
  closeDealStudyPoll,
};

function mapServiceError(error: unknown): never {
  if (error instanceof AccessDeniedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
  }
  if (error instanceof NotFoundError) {
    throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
  }
  if (error instanceof InvalidStateError) {
    throw new TRPCError({ code: 'CONFLICT', message: error.message });
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error',
    cause: error instanceof Error ? error : undefined,
  });
}

export function createContentRouter(overrides: Partial<ContentRouterDeps> = {}) {
  const deps = { ...defaultDeps, ...overrides };

  return router({
    list: publicProcedure.input(listContentItemsSchema.optional()).query(async ({ ctx, input }) => {
      try {
        const items = await deps.listContentItemsForActor(
          {
            userId: ctx.userId,
            globalRoles: ctx.session?.user?.globalRoles,
          },
          input,
        );
        return { items };
      } catch (error) {
        mapServiceError(error);
      }
    }),
    feed: publicProcedure.input(listContentFeedSchema.optional()).query(async ({ ctx, input }) => {
      try {
        const items = await deps.listContentFeedForActor(
          {
            userId: ctx.userId,
            globalRoles: ctx.session?.user?.globalRoles,
          },
          input,
        );
        return { items };
      } catch (error) {
        mapServiceError(error);
      }
    }),
    get: publicProcedure
      .input(z.object({ contentId: z.string().trim().min(1) }))
      .query(async ({ ctx, input }) => {
        try {
          const item = await deps.getContentItem(input.contentId, {
            userId: ctx.userId,
            globalRoles: ctx.session?.user?.globalRoles,
          });
          return { item };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    create: protectedProcedure.input(createContentItemSchema).mutation(async ({ ctx, input }) => {
      try {
        const item = await deps.createContentItem(ctx.userId, input, ctx.session?.user?.globalRoles);
        return { item };
      } catch (error) {
        mapServiceError(error);
      }
    }),
    updateDraft: protectedProcedure
      .input(
        z.object({
          contentId: z.string().trim().min(1),
          data: updateContentDraftSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const item = await deps.updateContentDraft(
            input.contentId,
            ctx.userId,
            input.data,
            ctx.session?.user?.globalRoles,
          );
          return { item };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    publish: protectedProcedure
      .input(
        z.object({
          contentId: z.string().trim().min(1),
          data: publishContentItemSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await deps.publishContentItem(
            input.contentId,
            ctx.userId,
            ctx.session?.user?.globalRoles,
          );
          return { result };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    archive: protectedProcedure
      .input(
        z.object({
          contentId: z.string().trim().min(1),
          data: archiveContentItemSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const item = await deps.archiveContentItem(
            input.contentId,
            ctx.userId,
            ctx.session?.user?.globalRoles,
          );
          return { item };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    unarchive: protectedProcedure
      .input(
        z.object({
          contentId: z.string().trim().min(1),
          data: unarchiveContentItemSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const item = await deps.unarchiveContentItem(
            input.contentId,
            ctx.userId,
            ctx.session?.user?.globalRoles,
          );
          return { item };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    hardDelete: protectedProcedure
      .input(
        z.object({
          contentId: z.string().trim().min(1),
          data: hardDeleteContentItemSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await deps.hardDeleteContentItem(
            input.contentId,
            ctx.userId,
            ctx.session?.user?.globalRoles,
          );
          return result;
        } catch (error) {
          mapServiceError(error);
        }
      }),
    study: router({
      get: publicProcedure
        .input(getDealStudySchema)
        .query(async ({ ctx, input }) => {
          try {
            const payload = await deps.getDealStudy(input.contentId, {
              userId: ctx.userId,
              globalRoles: ctx.session?.user?.globalRoles,
            });
            return payload;
          } catch (error) {
            mapServiceError(error);
          }
        }),
      upsertDraft: protectedProcedure
        .input(upsertDealStudyDraftSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const payload = await deps.upsertDealStudyDraft(
              input.contentId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return payload;
          } catch (error) {
            mapServiceError(error);
          }
        }),
      upsertPlay: protectedProcedure
        .input(upsertDealStudyPlaySchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const payload = await deps.upsertDealStudyPlaySteps(
              input.contentId,
              ctx.userId,
              input.steps,
              ctx.session?.user?.globalRoles,
            );
            return payload;
          } catch (error) {
            mapServiceError(error);
          }
        }),
      upsertDd: protectedProcedure
        .input(upsertDealStudyDdSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const payload = await deps.upsertDealStudyDdSnapshot(
              input.contentId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return payload;
          } catch (error) {
            mapServiceError(error);
          }
        }),
      comments: publicProcedure
        .input(listDealStudyCommentsSchema)
        .query(async ({ ctx, input }) => {
          try {
            const comments = await deps.listDealStudyComments(input.contentId, {
              userId: ctx.userId,
              globalRoles: ctx.session?.user?.globalRoles,
            });
            return { comments };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      addComment: protectedProcedure
        .input(createDealStudyCommentSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const comment = await deps.createDealStudyComment(
              input.contentId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { comment };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      createPoll: protectedProcedure
        .input(createDealStudyPollSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const poll = await deps.createDealStudyPoll(
              input.contentId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { poll };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      votePoll: protectedProcedure
        .input(voteDealStudyPollSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const poll = await deps.voteDealStudyPoll(
              input.contentId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { poll };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      closePoll: protectedProcedure
        .input(closeDealStudyPollSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const poll = await deps.closeDealStudyPoll(
              input.contentId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { poll };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
  });
}

export const contentRouter = createContentRouter();
