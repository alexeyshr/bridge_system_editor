import { createTRPCContext } from '@/lib/trpc/context';
import { appRouter } from '@/lib/trpc/root';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const endpoint = '/api/trpc';

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext: () => createTRPCContext(),
    onError: ({ error, path }) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`tRPC failed on ${path ?? '<unknown>'}:`, error);
      }
    },
  });
}

export { handler as GET, handler as POST };
