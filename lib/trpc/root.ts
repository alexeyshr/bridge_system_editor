import { router } from './init';
import { biddingRouter } from './routers/bidding';
import { contentRouter } from './routers/content';
import { learningBooksRouter } from './routers/learning-books';
import { spacesRouter } from './routers/spaces';

export const appRouter = router({
  bidding: biddingRouter,
  content: contentRouter,
  learningBooks: learningBooksRouter,
  spaces: spacesRouter,
});

export type AppRouter = typeof appRouter;
