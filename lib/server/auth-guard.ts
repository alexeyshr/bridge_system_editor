import { getServerAuthSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle/client';
import { biddingSystems, systemShares } from '@/lib/db/drizzle/schema';
import { and, eq } from 'drizzle-orm';

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
  const [system] = await db
    .select({
      ownerId: biddingSystems.ownerId,
    })
    .from(biddingSystems)
    .where(eq(biddingSystems.id, systemId))
    .limit(1);
  if (!system) return 'none';
  if (system.ownerId === userId) return 'owner';

  const [share] = await db
    .select({
      role: systemShares.role,
    })
    .from(systemShares)
    .where(and(eq(systemShares.systemId, systemId), eq(systemShares.userId, userId)))
    .limit(1);

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
