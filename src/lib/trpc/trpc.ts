/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn more about configuring tRPC: https://trpc.io/docs/server/initialization
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { auth, db } from '@/lib/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// 1. CONTEXT CREATION
export const createContext = async (opts: { headers: Headers }) => {
  const { headers } = opts;
  const authorization = headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { user: null };
  }
  
  const idToken = authorization.split('Bearer ')[1];

  try {
    const decodedClaims = await auth.verifyIdToken(idToken);
    return { user: decodedClaims };
  } catch (error) {
    // Token is invalid or expired.
    return { user: null };
  }
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const middleware = t.middleware;

// 2. MIDDLEWARE
const isAuthenticated = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const ensureUserExists = middleware(async ({ ctx, next }) => {
    const user = ctx.user!;
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        console.log(`User document not found for uid: ${user.uid}. Creating...`);
        await userRef.set({
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            purchasedPacks: [],
            installedPacks: ["core_base_styles"],
            subscriptionTier: "free",
            totalLikes: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`User document created for uid: ${user.uid}`);
    }

    return next({
        ctx: {
            ...ctx,
            user: user,
        },
    });
});

const isAdmin = middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.user.admin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not an admin.' });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const privateProcedure = t.procedure.use(isAuthenticated).use(ensureUserExists);
export const adminProcedure = t.procedure.use(isAuthenticated).use(ensureUserExists).use(isAdmin);
