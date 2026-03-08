import { verifyPassword } from '@/lib/auth/password';
import { normalizeTelegramUsername, TelegramAuthPayload, verifyTelegramAuth } from '@/lib/auth/telegram';
import { db } from '@/lib/db/drizzle/client';
import { authAccounts, users } from '@/lib/db/drizzle/schema';
import { createEntityId } from '@/lib/server/utils/id';
import { and, eq } from 'drizzle-orm';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

type AuthUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  passwordHash: string | null;
};

function toSessionUser(user: Pick<AuthUserRow, 'id' | 'email' | 'displayName'>) {
  return {
    id: user.id,
    email: user.email ?? undefined,
    name: user.displayName ?? undefined,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

async function findUserByEmail(email: string): Promise<AuthUserRow | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

async function findTelegramLinkedUser(providerAccountId: string): Promise<AuthUserRow | null> {
  const [linked] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
    })
    .from(authAccounts)
    .innerJoin(users, eq(authAccounts.userId, users.id))
    .where(
      and(eq(authAccounts.provider, 'telegram'), eq(authAccounts.providerAccountId, providerAccountId)),
    )
    .limit(1);

  return linked ?? null;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return toSessionUser(user);
      },
    }),
    CredentialsProvider({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: { label: 'Telegram ID', type: 'text' },
        first_name: { label: 'First Name', type: 'text' },
        last_name: { label: 'Last Name', type: 'text' },
        username: { label: 'Username', type: 'text' },
        photo_url: { label: 'Photo URL', type: 'text' },
        auth_date: { label: 'Auth Date', type: 'text' },
        hash: { label: 'Hash', type: 'text' },
      },
      authorize: async (credentials) => {
        const payload: TelegramAuthPayload = {
          id: credentials?.id ?? '',
          first_name: credentials?.first_name,
          last_name: credentials?.last_name,
          username: credentials?.username,
          photo_url: credentials?.photo_url,
          auth_date: credentials?.auth_date ?? '',
          hash: credentials?.hash ?? '',
        };

        const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
        if (!verifyTelegramAuth(payload, botToken)) return null;

        const existingLink = await findTelegramLinkedUser(payload.id);
        if (existingLink) {
          return toSessionUser(existingLink);
        }

        const username = normalizeTelegramUsername(payload.username);
        const displayName = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() || null;
        const now = new Date();
        const userId = createEntityId('usr');

        try {
          await db.transaction(async (tx) => {
            await tx.insert(users).values({
              id: userId,
              displayName,
              telegramUsername: username,
              createdAt: now,
              updatedAt: now,
            });

            await tx.insert(authAccounts).values({
              id: createEntityId('acct'),
              userId,
              provider: 'telegram',
              providerAccountId: payload.id,
              createdAt: now,
            });
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            const linked = await findTelegramLinkedUser(payload.id);
            if (linked) {
              return toSessionUser(linked);
            }
          }
          throw error;
        }

        return {
          id: userId,
          email: undefined,
          name: displayName ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = { id: '' };
      }
      if (token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};
