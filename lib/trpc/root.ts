import { router } from './init';
import { biddingRouter } from './routers/bidding';

export const appRouter = router({
  bidding: biddingRouter,
});

export type AppRouter = typeof appRouter;
