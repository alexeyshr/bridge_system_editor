import { createInviteForSystem, listInvitesForSystem, acceptInviteToken } from '@/lib/server/invite-service';
import { searchUsers } from '@/lib/server/users-service';
import {
  AccessDeniedError,
  NotFoundError,
  RevisionConflictError,
  UserLookupError,
  createSystemForUser,
  getSystemForUser,
  listSystemShares,
  listSystemsForUser,
  updateSystemMetadata,
  upsertSystemNodes,
  upsertSystemShare,
} from '@/lib/server/systems-service';
import { createInviteSchema } from '@/lib/validation/invites';
import {
  createSystemSchema,
  updateSystemSchema,
  upsertNodesSchema,
  upsertShareSchema,
} from '@/lib/validation/systems';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../init';

type SearchUserResult = {
  id: string;
  email: string | null;
  displayName: string | null;
  telegramUsername: string | null;
};

export interface BiddingRouterDeps {
  listSystemsForUser: typeof listSystemsForUser;
  createSystemForUser: typeof createSystemForUser;
  getSystemForUser: typeof getSystemForUser;
  updateSystemMetadata: typeof updateSystemMetadata;
  upsertSystemNodes: typeof upsertSystemNodes;
  listSystemShares: typeof listSystemShares;
  upsertSystemShare: typeof upsertSystemShare;
  listInvitesForSystem: typeof listInvitesForSystem;
  createInviteForSystem: typeof createInviteForSystem;
  acceptInviteToken: typeof acceptInviteToken;
  searchUsers: (query: string, currentUserId: string) => Promise<SearchUserResult[]>;
}

function mapServiceError(error: unknown): never {
  if (error instanceof AccessDeniedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
  }
  if (error instanceof NotFoundError) {
    throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
  }
  if (error instanceof RevisionConflictError) {
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

const defaultDeps: BiddingRouterDeps = {
  listSystemsForUser,
  createSystemForUser,
  getSystemForUser,
  updateSystemMetadata,
  upsertSystemNodes,
  listSystemShares,
  upsertSystemShare,
  listInvitesForSystem,
  createInviteForSystem,
  acceptInviteToken,
  searchUsers,
};

export function createBiddingRouter(overrides: Partial<BiddingRouterDeps> = {}) {
  const deps = { ...defaultDeps, ...overrides };

  return router({
    systems: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        try {
          const systems = await deps.listSystemsForUser(ctx.userId);
          return { systems };
        } catch (error) {
          mapServiceError(error);
        }
      }),
      create: protectedProcedure.input(createSystemSchema).mutation(async ({ ctx, input }) => {
        try {
          const system = await deps.createSystemForUser(ctx.userId, input);
          return { system };
        } catch (error) {
          mapServiceError(error);
        }
      }),
      get: protectedProcedure
        .input(z.object({ systemId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          try {
            const system = await deps.getSystemForUser(input.systemId, ctx.userId);
            return { system };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      update: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: updateSystemSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const system = await deps.updateSystemMetadata(input.systemId, ctx.userId, input.data);
            return { system };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
    nodes: router({
      sync: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: upsertNodesSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const sync = await deps.upsertSystemNodes(input.systemId, ctx.userId, input.data);
            return { sync };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
    shares: router({
      list: protectedProcedure
        .input(z.object({ systemId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          try {
            const shares = await deps.listSystemShares(input.systemId, ctx.userId);
            return { shares };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      upsert: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: upsertShareSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const share = await deps.upsertSystemShare(input.systemId, ctx.userId, input.data);
            return { share };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
    invites: router({
      list: protectedProcedure
        .input(z.object({ systemId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          try {
            const invites = await deps.listInvitesForSystem(input.systemId, ctx.userId);
            return { invites };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      create: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: createInviteSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const invite = await deps.createInviteForSystem(input.systemId, ctx.userId, input.data);
            return { invite };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      accept: protectedProcedure
        .input(z.object({ token: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          try {
            const invite = await deps.acceptInviteToken(input.token, ctx.userId);
            return { invite };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
    users: router({
      search: protectedProcedure
        .input(
          z.object({
            q: z.string().trim().min(2),
          }),
        )
        .query(async ({ ctx, input }) => {
          try {
            const users = await deps.searchUsers(input.q, ctx.userId);
            return { users };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
  });
}

export const biddingRouter = createBiddingRouter();
