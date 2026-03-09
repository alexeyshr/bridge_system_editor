import { createInviteForSystem, listInvitesForSystem, acceptInviteToken } from '@/lib/server/invite-service';
import { searchUsers } from '@/lib/server/users-service';
import {
  AccessDeniedError,
  assertSystemCapability,
  compareDraftWithVersion,
  InvalidStateError,
  NotFoundError,
  RevisionConflictError,
  UserLookupError,
  createDraftFromVersion,
  createSystemForUser,
  freezeTournamentBindings,
  freezeTournamentBinding,
  getSystemForUser,
  listSystemVersions,
  listTournamentBindings,
  listSystemShares,
  listSystemsForUser,
  publishSystemVersion,
  removeTournamentBinding,
  updateSystemMetadata,
  upsertTournamentBinding,
  upsertSystemNodes,
  upsertSystemShare,
} from '@/lib/server/systems-service';
import { createInviteSchema } from '@/lib/validation/invites';
import {
  compareDraftWithVersionSchema,
  createDraftFromVersionSchema,
  createSystemSchema,
  freezeTournamentBindingsSchema,
  freezeTournamentBindingSchema,
  listSystemsSchema,
  listTournamentBindingsSchema,
  publishSystemVersionSchema,
  removeTournamentBindingSchema,
  updateSystemSchema,
  upsertTournamentBindingSchema,
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
  assertSystemCapability: typeof assertSystemCapability;
  listSystemsForUser: typeof listSystemsForUser;
  createSystemForUser: typeof createSystemForUser;
  getSystemForUser: typeof getSystemForUser;
  updateSystemMetadata: typeof updateSystemMetadata;
  upsertSystemNodes: typeof upsertSystemNodes;
  listSystemShares: typeof listSystemShares;
  upsertSystemShare: typeof upsertSystemShare;
  listSystemVersions: typeof listSystemVersions;
  publishSystemVersion: typeof publishSystemVersion;
  createDraftFromVersion: typeof createDraftFromVersion;
  compareDraftWithVersion: typeof compareDraftWithVersion;
  listTournamentBindings: typeof listTournamentBindings;
  upsertTournamentBinding: typeof upsertTournamentBinding;
  freezeTournamentBinding: typeof freezeTournamentBinding;
  removeTournamentBinding: typeof removeTournamentBinding;
  freezeTournamentBindings: typeof freezeTournamentBindings;
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

const defaultDeps: BiddingRouterDeps = {
  assertSystemCapability,
  listSystemsForUser,
  createSystemForUser,
  getSystemForUser,
  updateSystemMetadata,
  upsertSystemNodes,
  listSystemShares,
  upsertSystemShare,
  listSystemVersions,
  publishSystemVersion,
  createDraftFromVersion,
  compareDraftWithVersion,
  listTournamentBindings,
  upsertTournamentBinding,
  freezeTournamentBinding,
  removeTournamentBinding,
  freezeTournamentBindings,
  listInvitesForSystem,
  createInviteForSystem,
  acceptInviteToken,
  searchUsers,
};

export function createBiddingRouter(overrides: Partial<BiddingRouterDeps> = {}) {
  const deps = { ...defaultDeps, ...overrides };

  return router({
    systems: router({
      list: protectedProcedure.input(listSystemsSchema.optional()).query(async ({ ctx, input }) => {
        try {
          const systems = await deps.listSystemsForUser(ctx.userId, input);
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
            await deps.assertSystemCapability(input.systemId, ctx.userId, 'shares.manage');
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
            await deps.assertSystemCapability(input.systemId, ctx.userId, 'shares.manage');
            const share = await deps.upsertSystemShare(input.systemId, ctx.userId, input.data);
            return { share };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
    lifecycle: router({
      versions: protectedProcedure
        .input(z.object({ systemId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          try {
            const versions = await deps.listSystemVersions(input.systemId, ctx.userId);
            return { versions };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      publish: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: publishSystemVersionSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const version = await deps.publishSystemVersion(input.systemId, ctx.userId, input.data);
            return { version };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      createDraft: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: createDraftFromVersionSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const draft = await deps.createDraftFromVersion(
              input.systemId,
              ctx.userId,
              input.data.versionId,
            );
            return { draft };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      compare: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: compareDraftWithVersionSchema,
          }),
        )
        .query(async ({ ctx, input }) => {
          try {
            const comparison = await deps.compareDraftWithVersion(
              input.systemId,
              ctx.userId,
              input.data.versionId,
            );
            return { comparison };
          } catch (error) {
            mapServiceError(error);
          }
        }),
    }),
    bindings: router({
      list: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: listTournamentBindingsSchema.optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          try {
            const bindings = await deps.listTournamentBindings(input.systemId, ctx.userId, input.data);
            return { bindings };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      upsert: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: upsertTournamentBindingSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const binding = await deps.upsertTournamentBinding(input.systemId, ctx.userId, input.data);
            return { binding };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      freeze: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: freezeTournamentBindingSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const binding = await deps.freezeTournamentBinding(
              input.systemId,
              ctx.userId,
              input.data.bindingId,
            );
            return { binding };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      remove: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: removeTournamentBindingSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const result = await deps.removeTournamentBinding(
              input.systemId,
              ctx.userId,
              input.data.bindingId,
            );
            return { result };
          } catch (error) {
            mapServiceError(error);
          }
        }),
      freezeTournament: protectedProcedure
        .input(
          z.object({
            systemId: z.string().min(1),
            data: freezeTournamentBindingsSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          try {
            const result = await deps.freezeTournamentBindings(
              input.systemId,
              ctx.userId,
              input.data.tournamentId,
            );
            return { result };
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
            await deps.assertSystemCapability(input.systemId, ctx.userId, 'invites.manage');
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
            await deps.assertSystemCapability(input.systemId, ctx.userId, 'invites.manage');
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
            systemId: z.string().min(1),
            q: z.string().trim().min(2),
          }),
        )
        .query(async ({ ctx, input }) => {
          try {
            await deps.assertSystemCapability(input.systemId, ctx.userId, 'users.search');
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
