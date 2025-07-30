import { router } from './trpc';
import { userRouter } from './routers/user';
import { dataPackRouter } from './routers/datapack';
import { characterRouter } from './routers/character';
import { collectionRouter } from './routers/collection';
import { adminRouter } from './routers/admin';
import { createContext } from './trpc';

export const appRouter = router({
  user: userRouter,
  datapack: dataPackRouter,
  character: characterRouter,
  collection: collectionRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
export { createContext };
