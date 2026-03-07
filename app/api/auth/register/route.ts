import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/prisma';
import { badRequest, conflict, created, serverError } from '@/lib/server/api-response';
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
    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (exists) {
      return conflict('Account with this email already exists');
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: parsed.data.displayName,
        accounts: {
          create: {
            provider: 'credentials',
            providerAccountId: email,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    return created({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Registration failed', error);
    return serverError('Failed to register account');
  }
}
