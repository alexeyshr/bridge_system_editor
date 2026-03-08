import { getServerAuthSession } from '@/lib/auth/session';

export async function createTRPCContext() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? null;

  return {
    session,
    userId,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
