import { authOptions } from '@/lib/auth/config';
import { getServerSession } from 'next-auth';

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}
