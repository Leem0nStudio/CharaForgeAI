import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { DecodedIdToken } from 'firebase-admin/auth';

const t = initTRPC.context<{
    user?: DecodedIdToken;
}>().create();

const middleware = t.middleware;

const isAuthenticated = middleware(async (opts) => {
  const session = cookies().get('__session')?.value || '';

  if (!session) {
    throw new Error('Unauthorized: No session cookie found.');
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(session, true);
    return opts.next({
      ctx: {
        user: decodedClaims,
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    throw new Error('Unauthorized: Invalid session cookie.');
  }
});

const isAdmin = middleware(async (opts) => {
    const { ctx } = opts;
    if (!ctx.user || !ctx.user.admin) {
        throw new Error('Forbidden: User is not an admin.');
    }
    return opts.next(opts);
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const privateProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = privateProcedure.use(isAdmin);

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
  likedBy: z.array(z.string()).default([]),
});

const CreateCharacterInputSchema = CharacterSchema.omit({ id: true, userId: true, likes: true, publicStatus: true, likedBy: true }).extend({
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
        likedBy: [],
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
      return { success: true };
    }),

  likeCharacter: privateProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const characterRef = db.collection('characters').doc(input.characterId);
      const characterDoc = await characterRef.get();
      if (!characterDoc.exists || !characterDoc.data()?.publicStatus) {
        throw new Error('Character not found or is not public.');
      }

      await db.runTransaction(async (transaction) => {
        const charDoc = await transaction.get(characterRef);
        if (!charDoc.exists) return;
        const likedBy = charDoc.data()?.likedBy || [];
        if (likedBy.includes(ctx.user.uid)) {
          return; // User has already liked this
        }
        transaction.update(characterRef, {
          likes: FieldValue.increment(1),
          likedBy: FieldValue.arrayUnion(ctx.user.uid),
        });
      });
      
      return { success: true };
    }),

  unlikeCharacter: privateProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const characterRef = db.collection('characters').doc(input.characterId);

       await db.runTransaction(async (transaction) => {
        const charDoc = await transaction.get(characterRef);
        if (!charDoc.exists) return;
        const likedBy = charDoc.data()?.likedBy || [];
        if (!likedBy.includes(ctx.user.uid)) {
          return; // User hasn't liked this, nothing to do
        }
        transaction.update(characterRef, {
          likes: FieldValue.increment(-1),
          likedBy: FieldValue.arrayRemove(ctx.user.uid),
        });
      });

      return { success: true };
    }),
});

const CollectionSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    characterIds: z.array(z.string()),
    createdAt: z.any(),
});

const CreateCollectionInputSchema = CollectionSchema.omit({
    id: true,
    userId: true,
    characterIds: true,
    createdAt: true,
});

const UpdateCollectionInputSchema = CreateCollectionInputSchema.partial().extend({
    id: z.string(),
});


const collectionRouter = router({
    create: privateProcedure
        .input(CreateCollectionInputSchema)
        .mutation(async ({ ctx, input }) => {
            const collectionData = {
                ...input,
                userId: ctx.user.uid,
                characterIds: [],
                createdAt: FieldValue.serverTimestamp(),
            };
            const collectionRef = await db.collection('collections').add(collectionData);
            return { id: collectionRef.id, ...collectionData };
        }),
    list: privateProcedure.query(async ({ ctx }) => {
        const snapshot = await db
            .collection('collections')
            .where('userId', '==', ctx.user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => CollectionSchema.parse({ id: doc.id, ...doc.data() }));
    }),
    get: privateProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const collectionDoc = await db.collection('collections').doc(input.id).get();
            if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user.uid) {
                throw new Error('Collection not found or access denied.');
            }
            const collectionData = CollectionSchema.parse({ id: collectionDoc.id, ...collectionDoc.data() });

            // Fetch characters in the collection
            if (collectionData.characterIds.length === 0) {
                return { ...collectionData, characters: [] };
            }

            const characterDocs = await db.collection('characters').where(FieldValue.documentId(), 'in', collectionData.characterIds).get();
            const characters = characterDocs.docs.map(doc => CharacterSchema.parse({ id: doc.id, ...doc.data() }));

            return { ...collectionData, characters };
        }),
    update: privateProcedure
        .input(UpdateCollectionInputSchema)
        .mutation(async ({ ctx, input }) => {
            const { id, ...dataToUpdate } = input;
            const collectionRef = db.collection('collections').doc(id);
            const collectionDoc = await collectionRef.get();
             if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user.uid) {
                throw new Error('Collection not found or access denied.');
            }
            await collectionRef.update({
                ...dataToUpdate,
                updatedAt: FieldValue.serverTimestamp(),
            });
            return { success: true };
        }),

    delete: privateProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const collectionRef = db.collection('collections').doc(input.id);
            const collectionDoc = await collectionRef.get();
             if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user.uid) {
                throw new Error('Collection not found or access denied.');
            }
            await collectionRef.delete();
            return { success: true };
        }),

    addCharacter: privateProcedure
        .input(z.object({ collectionId: z.string(), characterId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const collectionRef = db.collection('collections').doc(input.collectionId);
            const collectionDoc = await collectionRef.get();
            if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user.uid) {
                throw new Error('Collection not found or access denied.');
            }
            await collectionRef.update({
                characterIds: FieldValue.arrayUnion(input.characterId),
            });
            return { success: true };
        }),
    
    removeCharacter: privateProcedure
        .input(z.object({ collectionId: z.string(), characterId: z.string() }))
        .mutation(async ({ ctx, input }) => {
             const collectionRef = db.collection('collections').doc(input.collectionId);
            const collectionDoc = await collectionRef.get();
            if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user.uid) {
                throw new Error('Collection not found or access denied.');
            }
            await collectionRef.update({
                characterIds: FieldValue.arrayRemove(input.characterId),
            });
            return { success: true };
        }),
});

const adminRouter = router({
    getStats: adminProcedure.query(async () => {
        const usersPromise = auth.listUsers();
        const charactersPromise = db.collection('characters').get();

        const [listUsersResult, charactersSnapshot] = await Promise.all([
            usersPromise,
            charactersPromise,
        ]);

        const totalUsers = listUsersResult.users.length;
        const totalCharacters = charactersSnapshot.size;

        return { totalUsers, totalCharacters };
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
  collection: collectionRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
