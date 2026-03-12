import NextAuth, { DefaultSession } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';
import type { PortalGlobalRole } from '@/lib/portal-access';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      globalRoles: PortalGlobalRole[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId?: string;
    globalRoles?: PortalGlobalRole[];
  }
}

declare module 'next-auth/adapters' {
  interface AdapterUser {
    id: string;
  }
}
