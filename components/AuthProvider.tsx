'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { TrpcProvider } from '@/components/TrpcProvider';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TrpcProvider>{children}</TrpcProvider>
    </SessionProvider>
  );
}
