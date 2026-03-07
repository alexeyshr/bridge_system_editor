import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { normalizeTelegramUsername, TelegramAuthPayload, verifyTelegramAuth } from '@/lib/auth/telegram';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.displayName ?? undefined,
        };
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

        const existingLink = await prisma.authAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'telegram',
              providerAccountId: payload.id,
            },
          },
          include: { user: true },
        });

        if (existingLink?.user) {
          return {
            id: existingLink.user.id,
            email: existingLink.user.email ?? undefined,
            name: existingLink.user.displayName ?? undefined,
          };
        }

        const username = normalizeTelegramUsername(payload.username);
        const displayName = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() || null;

        const created = await prisma.user.create({
          data: {
            displayName,
            telegramUsername: username,
            accounts: {
              create: {
                provider: 'telegram',
                providerAccountId: payload.id,
              },
            },
          },
        });

        return {
          id: created.id,
          email: created.email ?? undefined,
          name: created.displayName ?? undefined,
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
