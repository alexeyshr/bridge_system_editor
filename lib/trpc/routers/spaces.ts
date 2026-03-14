import {
  acceptSpaceInviteToken,
  createSpaceForUser,
  createSpaceInvite,
  createSpaceJoinRequest,
  getSpaceForActor,
  listMySpaceJoinRequests,
  listSpaceInvites,
  listSpaceJoinRequests,
  listSpacesForActor,
  reviewSpaceJoinRequest,
  revokeSpaceInvite,
  updateSpaceForUser,
} from '@/lib/server/spaces-service';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../init';
import {
  acceptSpaceInviteSchema,
  createSpaceInviteSchema,
  createSpaceJoinRequestSchema,
  createSpaceSchema,
  listSpaceInvitesSchema,
  listMySpaceJoinRequestsSchema,
  listSpaceJoinRequestsSchema,
  listSpacesSchema,
  reviewSpaceJoinRequestSchema,
  revokeSpaceInviteSchema,
  updateSpaceSchema,
} from '@/lib/validation/spaces';
import { AccessDeniedError, InvalidStateError, NotFoundError, UserLookupError } from '@/lib/server/domain-errors';

export interface SpacesRouterDeps {
  listSpacesForActor: typeof listSpacesForActor;
  getSpaceForActor: typeof getSpaceForActor;
  createSpaceForUser: typeof createSpaceForUser;
  updateSpaceForUser: typeof updateSpaceForUser;
  createSpaceJoinRequest: typeof createSpaceJoinRequest;
  listMySpaceJoinRequests: typeof listMySpaceJoinRequests;
  listSpaceJoinRequests: typeof listSpaceJoinRequests;
  reviewSpaceJoinRequest: typeof reviewSpaceJoinRequest;
  listSpaceInvites: typeof listSpaceInvites;
  createSpaceInvite: typeof createSpaceInvite;
  revokeSpaceInvite: typeof revokeSpaceInvite;
  acceptSpaceInviteToken: typeof acceptSpaceInviteToken;
}

const defaultDeps: SpacesRouterDeps = {
  listSpacesForActor,
  getSpaceForActor,
  createSpaceForUser,
  updateSpaceForUser,
  createSpaceJoinRequest,
  listMySpaceJoinRequests,
  listSpaceJoinRequests,
  reviewSpaceJoinRequest,
  listSpaceInvites,
  createSpaceInvite,
  revokeSpaceInvite,
  acceptSpaceInviteToken,
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
  if (error instanceof UserLookupError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error',
    cause: error instanceof Error ? error : undefined,
  });
}

export function createSpacesRouter(overrides: Partial<SpacesRouterDeps> = {}) {
  const deps = { ...defaultDeps, ...overrides };

  return router({
    list: publicProcedure.input(listSpacesSchema.optional()).query(async ({ ctx, input }) => {
      try {
        const spaces = await deps.listSpacesForActor(
          {
            userId: ctx.userId,
            globalRoles: ctx.session?.user?.globalRoles,
          },
          input,
        );
        return { spaces };
      } catch (error) {
        mapServiceError(error);
      }
    }),
    get: publicProcedure
      .input(z.object({ spaceId: z.string().trim().min(1) }))
      .query(async ({ ctx, input }) => {
        try {
          const space = await deps.getSpaceForActor(input.spaceId, {
            userId: ctx.userId,
            globalRoles: ctx.session?.user?.globalRoles,
          });
          return { space };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    create: protectedProcedure.input(createSpaceSchema).mutation(async ({ ctx, input }) => {
      try {
        const space = await deps.createSpaceForUser(ctx.userId, input, ctx.session?.user?.globalRoles);
        return { space };
      } catch (error) {
        mapServiceError(error);
      }
    }),
    update: protectedProcedure
      .input(
        z.object({
          spaceId: z.string().trim().min(1),
          data: updateSpaceSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const space = await deps.updateSpaceForUser(
            input.spaceId,
            ctx.userId,
            input.data,
            ctx.session?.user?.globalRoles,
          );
          return { space };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    joinRequests: router({
      mine: protectedProcedure
        .input(listMySpaceJoinRequestsSchema.optional())
        .query(async ({ ctx, input }) => {
          try {
            const requests = await deps.listMySpaceJoinRequests(ctx.userId, input);
            return { requests };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      create: protectedProcedure
        .input(
          z.object({
            spaceId: z.string().trim().min(1),
            data: createSpaceJoinRequestSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const request = await deps.createSpaceJoinRequest(
              input.spaceId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { request };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      list: protectedProcedure
        .input(
          z.object({
            spaceId: z.string().trim().min(1),
            data: listSpaceJoinRequestsSchema.optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          try {
            const requests = await deps.listSpaceJoinRequests(
              input.spaceId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { requests };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      review: protectedProcedure
        .input(
          z.object({
            spaceId: z.string().trim().min(1),
            data: reviewSpaceJoinRequestSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const result = await deps.reviewSpaceJoinRequest(
              input.spaceId,
              input.data.requestId,
              ctx.userId,
              input.data.decision,
              ctx.session?.user?.globalRoles,
            );
            return { result };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
    invites: router({
      list: protectedProcedure
        .input(
          z.object({
            spaceId: z.string().trim().min(1),
            data: listSpaceInvitesSchema.optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          try {
            const invites = await deps.listSpaceInvites(
              input.spaceId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { invites };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      create: protectedProcedure
        .input(
          z.object({
            spaceId: z.string().trim().min(1),
            data: createSpaceInviteSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const invite = await deps.createSpaceInvite(
              input.spaceId,
              ctx.userId,
              input.data,
              ctx.session?.user?.globalRoles,
            );
            return { invite };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      revoke: protectedProcedure
        .input(
          z.object({
            spaceId: z.string().trim().min(1),
            data: revokeSpaceInviteSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const invite = await deps.revokeSpaceInvite(
              input.spaceId,
              input.data.inviteId,
              ctx.userId,
              ctx.session?.user?.globalRoles,
            );
            return { invite };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      accept: protectedProcedure.input(acceptSpaceInviteSchema).mutation(async ({ ctx, input }) => {
        try {
          const invite = await deps.acceptSpaceInviteToken(
            input.token,
            ctx.userId,
            ctx.session?.user?.email,
          );
          return { invite };
        } catch (error) {
          mapServiceError(error);
        }
      }),
    }),
  });
}

export const spacesRouter = createSpacesRouter();
