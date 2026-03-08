import { hashPassword } from '@/lib/auth/password';
import { db } from '@/lib/db/drizzle/client';
import { authAccounts, users } from '@/lib/db/drizzle/schema';
import { badRequest, conflict, created, serverError } from '@/lib/server/api-response';
import { createEntityId } from '@/lib/server/utils/id';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(256),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest('Invalid registration payload', parsed.error.flatten());
    }

    const email = parsed.data.email.toLowerCase();
    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (exists) {
      return conflict('Account with this email already exists');
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();
    const userId = createEntityId('usr');

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email,
        passwordHash,
        displayName: parsed.data.displayName ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(authAccounts).values({
        id: createEntityId('acct'),
        userId,
        provider: 'credentials',
        providerAccountId: email,
        createdAt: now,
      });
    });

    return created({
      user: {
        id: userId,
        email,
        displayName: parsed.data.displayName ?? null,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Registration failed', error);
    return serverError('Failed to register account');
  }
}
