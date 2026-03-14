import { router } from './init';
import { biddingRouter } from './routers/bidding';
import { contentRouter } from './routers/content';
import { spacesRouter } from './routers/spaces';

export const appRouter = router({
  bidding: biddingRouter,
  content: contentRouter,
  spaces: spacesRouter,
});

export type AppRouter = typeof appRouter;
