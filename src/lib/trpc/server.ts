import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase/server';

const t = initTRPC.create();

const middleware = t.middleware;

const isAuthenticated = middleware(async (opts) => {
  const session = cookies().get('__session')?.value || '';

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(session, true);
    return opts.next({
      ctx: {
        user: decodedClaims,
      },
    });
  } catch (error) {
    throw new Error('Unauthorized');
  }
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const privateProcedure = t.procedure.use(isAuthenticated);


export const appRouter = router({
  greeting: publicProcedure
    .input(z.object({ text: z.string().nullish() }).nullish())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? 'tRPC world'}`,
      };
    }),
});

export type AppRouter = typeof appRouter;
