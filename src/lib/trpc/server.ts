import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

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
  email: z.string().email().nullable(),
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
  installDataPack: privateProcedure
    .input(z.object({ packId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userRef = db.collection('users').doc(ctx.user.uid);
      await userRef.update({
        installedPacks: FieldValue.arrayUnion(input.packId),
      });
      return { success: true };
    }),
  uninstallDataPack: privateProcedure
    .input(z.object({ packId: z.string() }))
    .mutation(async ({ ctx, input }) => {
       if (input.packId === 'core_base_styles') {
        throw new Error('Cannot uninstall core system pack.');
       }
      const userRef = db.collection('users').doc(ctx.user.uid);
      await userRef.update({
        installedPacks: FieldValue.arrayRemove(input.packId),
      });
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

const CharacterSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  bio: z.string(),
  imageUrl: z.string().url(),
  associatedDataPacks: z.array(z.string()),
  publicStatus: z.boolean().default(false),
  likes: z.number().default(0),
});

const CreateCharacterInputSchema = CharacterSchema.omit({ id: true, userId: true, likes: true, publicStatus: true }).extend({
  publicStatus: z.boolean().optional(),
});

const UpdateCharacterInputSchema = CreateCharacterInputSchema.partial().extend({
  id: z.string(),
});


const characterRouter = router({
  createCharacter: privateProcedure
    .input(CreateCharacterInputSchema)
    .mutation(async ({ ctx, input }) => {
      const characterData = {
        ...input,
        userId: ctx.user.uid,
        likes: 0,
        publicStatus: input.publicStatus ?? false,
        createdAt: FieldValue.serverTimestamp(),
      };
      const characterRef = await db.collection('characters').add(characterData);
      return { id: characterRef.id, ...characterData };
    }),

  getCharacter: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const characterDoc = await db.collection('characters').doc(input.id).get();
      if (!characterDoc.exists) {
        throw new Error('Character not found');
      }
      return CharacterSchema.parse({ id: characterDoc.id, ...characterDoc.data() });
    }),
  
  listUserCharacters: privateProcedure
    .query(async ({ ctx }) => {
      const snapshot = await db.collection('characters').where('userId', '==', ctx.user.uid).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => CharacterSchema.parse({ id: doc.id, ...doc.data() }));
    }),

  listPublicCharacters: publicProcedure
    .query(async () => {
      const snapshot = await db.collection('characters').where('publicStatus', '==', true).orderBy('likes', 'desc').limit(50).get();
      return snapshot.docs.map(doc => CharacterSchema.parse({ id: doc.id, ...doc.data() }));
    }),

  updateCharacter: privateProcedure
    .input(UpdateCharacterInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...dataToUpdate } = input;
      const characterRef = db.collection('characters').doc(id);
      const characterDoc = await characterRef.get();

      if (!characterDoc.exists) {
        throw new Error('Character not found.');
      }
      if (characterDoc.data()?.userId !== ctx.user.uid) {
        throw new Error('User not authorized to update this character.');
      }

      await characterRef.update({
        ...dataToUpdate,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true };
    }),

  deleteCharacter: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const characterRef = db.collection('characters').doc(input.id);
      const characterDoc = await characterRef.get();

      if (!characterDoc.exists) {
        throw new Error('Character not found.');
      }
      if (characterDoc.data()?.userId !== ctx.user.uid) {
        throw new Error('User not authorized to delete this character.');
      }

      await characterRef.delete();
      // Note: This doesn't delete the associated image from Cloud Storage.
      // That would require a separate, more complex implementation.
      return { success: true };
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
  character: characterRouter,
});

export type AppRouter = typeof appRouter;
