import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase/server';

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

const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  purchasedPacks: z.array(z.string()),
  installedPacks: z.array(z.string()),
  subscriptionTier: z.string(),
});

const UserUpdateSchema = UserSchema.partial();

const userRouter = router({
  getUser: privateProcedure.query(async ({ ctx }) => {
    const userRef = db.collection('users').doc(ctx.user.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    return UserSchema.parse(userDoc.data());
  }),
  updateUser: privateProcedure
    .input(UserUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userRef = db.collection('users').doc(ctx.user.uid);
      await userRef.set(input, { merge: true });
      return { success: true };
    }),
  deleteUser: privateProcedure.mutation(async ({ ctx }) => {
    await db.collection('users').doc(ctx.user.uid).delete();
    await auth.deleteUser(ctx.user.uid);
    return { success: true };
  }),
});

const DataPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  premiumStatus: z.enum(['free', 'purchased', 'subscription']),
  content: z.array(z.object({
    type: z.string(),
    reference: z.string(),
  })),
});

const dataPackRouter = router({
  list: publicProcedure.query(async () => {
    const packsSnapshot = await db.collection('datapacks').get();
    const packs = packsSnapshot.docs.map(doc => DataPackSchema.parse({ id: doc.id, ...doc.data() }));
    return packs;
  }),
});

export const appRouter = router({
  greeting: publicProcedure
    .input(z.object({ text: z.string().nullish() }).nullish())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? 'tRPC world'}`,
      };
    }),
  user: userRouter,
  datapack: dataPackRouter,
});

export type AppRouter = typeof appRouter;
