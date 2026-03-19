import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { protectedProcedure, publicProcedure, router } from '../init';
import { db } from '@/lib/db/drizzle/client';
import { learningBooks } from '@/lib/db/drizzle/schema';

function requireAdmin(globalRoles?: string[] | null) {
  const roles = globalRoles ?? [];
  if (!roles.includes('admin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
}

const createBookSchema = z.object({
  id: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
  prefix: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(200),
  description: z.string().optional(),
  difficulty: z.string().optional(),
  accentColor: z.string().default('#2563eb'),
  icon: z.string().default('spade'),
  coverUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

const updateBookSchema = z.object({
  slug: z.string().trim().min(1).max(100).optional(),
  prefix: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(300).optional(),
  author: z.string().trim().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  accentColor: z.string().optional(),
  icon: z.string().optional(),
  coverUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const learningBooksRouter = router({
  list: publicProcedure.query(async () => {
    const books = await db
      .select()
      .from(learningBooks)
      .orderBy(asc(learningBooks.sortOrder), asc(learningBooks.title));
    return { books };
  }),

  get: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1) }))
    .query(async ({ input }) => {
      const [book] = await db
        .select()
        .from(learningBooks)
        .where(eq(learningBooks.slug, input.slug))
        .limit(1);
      if (!book) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' });
      }
      return { book };
    }),

  create: protectedProcedure
    .input(createBookSchema)
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session?.user?.globalRoles);
      const now = new Date();
      const [book] = await db
        .insert(learningBooks)
        .values({
          id: input.id,
          slug: input.slug,
          prefix: input.prefix,
          title: input.title,
          author: input.author,
          description: input.description ?? null,
          difficulty: input.difficulty ?? null,
          accentColor: input.accentColor,
          icon: input.icon,
          coverUrl: input.coverUrl ?? null,
          sortOrder: input.sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return { book };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().trim().min(1),
      data: updateBookSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session?.user?.globalRoles);
      const [book] = await db
        .update(learningBooks)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(learningBooks.id, input.id))
        .returning();
      if (!book) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' });
      }
      return { book };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session?.user?.globalRoles);
      const [deleted] = await db
        .delete(learningBooks)
        .where(eq(learningBooks.id, input.id))
        .returning({ id: learningBooks.id });
      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' });
      }
      return { success: true };
    }),
});
