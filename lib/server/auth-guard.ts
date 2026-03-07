import { getServerAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export type SystemAccessRole = 'owner' | 'editor' | 'viewer' | 'none';

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export async function requireAuthUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  return {
    id: userId,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

export async function getSystemAccessRole(systemId: string, userId: string): Promise<SystemAccessRole> {
  const system = await prisma.biddingSystem.findUnique({
    where: { id: systemId },
    select: {
      ownerId: true,
      shares: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!system) return 'none';
  if (system.ownerId === userId) return 'owner';

  const share = system.shares[0];
  if (!share) return 'none';
  if (share.role === 'editor') return 'editor';
  return 'viewer';
}

export function canRead(role: SystemAccessRole): boolean {
  return role !== 'none';
}

export function canWrite(role: SystemAccessRole): boolean {
  return role === 'owner' || role === 'editor';
}

export function canManage(role: SystemAccessRole): boolean {
  return role === 'owner';
}
