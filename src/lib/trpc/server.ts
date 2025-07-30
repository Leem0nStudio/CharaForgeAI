import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { auth, db } from '@/lib/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { DecodedIdToken } from 'firebase-admin/auth';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// 1. CONTEXT CREATION
// This function is responsible for creating the context for each request.
// It now receives the cookies object directly from the request handler.
export const createContext = async (cookieStore: ReadonlyRequestCookies) => {
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    return { user: null };
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return { user: decodedClaims };
  } catch (error) {
    // Session cookie is invalid or expired.
    return { user: null };
  }
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const middleware = t.middleware;

// 2. MIDDLEWARE
// The middleware now just checks if the user object exists in the context.
// It no longer needs to read cookies itself.
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
export const privateProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAuthenticated).use(isAdmin);

const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email().nullable(),
  purchasedPacks: z.array(z.string()),
  installedPacks: z.array(z.string()),
  subscriptionTier: z.string(),
  totalLikes: z.number().default(0),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
});

const UserUpdateSchema = UserSchema.partial();

const userRouter = router({
  getUser: privateProcedure.query(async ({ ctx }) => {
    const userRef = db.collection('users').doc(ctx.user!.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error('User not found in Firestore');
    }
    
    const data = userDoc.data()!;
    
    // Auto-correction for missing base pack
    if (!data.installedPacks || !data.installedPacks.includes('core_base_styles')) {
        const updatedPacks = [...(data.installedPacks || []), 'core_base_styles'];
        await userRef.update({ installedPacks: updatedPacks });
        data.installedPacks = updatedPacks;
    }

    if (typeof data.totalLikes === 'undefined') {
        data.totalLikes = 0;
    }
    return UserSchema.parse(data);
  }),
   updateUser: privateProcedure
    .input(UserUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userRef = db.collection('users').doc(ctx.user!.uid);
      await userRef.set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { success: true };
    }),
  deleteUser: privateProcedure.mutation(async ({ ctx }) => {
    await db.collection('users').doc(ctx.user!.uid).delete();
    await auth.deleteUser(ctx.user!.uid);
    return { success: true };
  }),
  installDataPack: privateProcedure
    .input(z.object({ packId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userRef = db.collection('users').doc(ctx.user!.uid);
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
      const userRef = db.collection('users').doc(ctx.user!.uid);
      await userRef.update({
        installedPacks: FieldValue.arrayRemove(input.packId),
      });
      return { success: true };
    }),
  getTopCreators: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).optional() }))
    .query(async ({ input }) => {
        const limit = input?.limit ?? 10;
        
        const usersSnapshot = await db
            .collection('users')
            .orderBy('totalLikes', 'desc')
            .limit(limit)
            .get();

        if (usersSnapshot.empty) {
            return [];
        }

        const creators = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: data.uid,
                displayName: data.displayName || 'Anonymous',
                photoURL: data.photoURL || null,
                totalLikes: data.totalLikes || 0,
            };
        });

        return creators;
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
  })).optional(),
  promptTemplate: z.string().optional(),
  createdAt: z.any().optional(),
});

const CreateDataPackInputSchema = DataPackSchema.omit({id: true, createdAt: true, promptTemplate: true}).extend({
    promptTemplateContent: z.string()
});

const ensureCoreDataPackExists = async () => {
    const corePackRef = db.collection('datapacks').doc('core_base_styles');
    const corePackDoc = await corePackRef.get();
    if (!corePackDoc.exists) {
        await corePackRef.set({
            name: 'Core Base Styles',
            description: 'A fundamental pack for basic character creation without a specific template. Freely describe your character.',
            premiumStatus: 'free',
            content: [],
            promptTemplate: '',
            createdAt: FieldValue.serverTimestamp(),
        });
        console.log('Core Base Styles DataPack created.');
    }
};


const dataPackRouter = router({
  list: publicProcedure.query(async () => {
    await ensureCoreDataPackExists();
    const packsSnapshot = await db.collection('datapacks').orderBy('createdAt', 'desc').get();
    return packsSnapshot.docs.map(doc => DataPackSchema.parse({ id: doc.id, ...doc.data() }));
  }),
  getNewDataPacks: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).optional() }))
    .query(async ({ input }) => {
        await ensureCoreDataPackExists();
        const limit = input?.limit ?? 4;
        const packsSnapshot = await db.collection('datapacks').orderBy('createdAt', 'desc').limit(limit).get();
        return packsSnapshot.docs.map(doc => DataPackSchema.parse({ id: doc.id, ...doc.data() }));
    }),
  create: adminProcedure
    .input(CreateDataPackInputSchema)
    .mutation(async ({ input }) => {
        const { promptTemplateContent, ...packData } = input;
        
        const packRef = db.collection('datapacks').doc();
        const packId = packRef.id;
        
        // No prompt template for the default creator.
        if (promptTemplateContent && promptTemplateContent.trim() !== '' && !promptTemplateContent.includes('template: |')) {
            const bucket = getStorage().bucket();
            const filePath = `DataPacks/${packId}/prompt_template.yaml`;
            const file = bucket.file(filePath);

            await file.save(promptTemplateContent, {
                contentType: 'text/yaml',
                gzip: true,
            });
             await packRef.set({
                ...packData,
                content: [],
                promptTemplate: `gs://${bucket.name}/${filePath}`,
                createdAt: FieldValue.serverTimestamp(),
            });
        } else {
             await packRef.set({
                ...packData,
                content: [],
                promptTemplate: '',
                createdAt: FieldValue.serverTimestamp(),
            });
        }
        
        return { success: true, id: packId };
    }),
    listAll: adminProcedure.query(async () => {
      await ensureCoreDataPackExists();
      const packsSnapshot = await db.collection('datapacks').orderBy('createdAt', 'desc').get();
      return packsSnapshot.docs.map(doc => DataPackSchema.parse({ id: doc.id, ...doc.data() }));
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
        userId: ctx.user!.uid,
        likes: 0,
        likedBy: [],
        publicStatus: input.publicStatus ?? false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
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
      const snapshot = await db.collection('characters').where('userId', '==', ctx.user!.uid).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => CharacterSchema.parse({ id: doc.id, ...doc.data() }));
    }),

  listPublicCharacters: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }))
    .query(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const snapshot = await db.collection('characters').where('publicStatus', '==', true).orderBy('likes', 'desc').limit(limit).get();
        const characters = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(char => char.imageUrl); // Ensure imageUrl exists
        return characters.map(char => CharacterSchema.parse(char));
    }),
  
  getTopCharacters: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }))
    .query(async ({ input }) => {
        const limit = input?.limit ?? 8;
        const snapshot = await db.collection('characters').where('publicStatus', '==', true).orderBy('likes', 'desc').limit(limit).get();
        const characters = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(char => char.imageUrl); // Ensure imageUrl exists
        return characters.map(char => CharacterSchema.parse(char));
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
      if (characterDoc.data()?.userId !== ctx.user!.uid) {
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
      if (characterDoc.data()?.userId !== ctx.user!.uid) {
        throw new Error('User not authorized to delete this character.');
      }

      await characterRef.delete();
      return { success: true };
    }),

  likeCharacter: privateProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const characterRef = db.collection('characters').doc(input.characterId);
      
      await db.runTransaction(async (transaction) => {
        const charDoc = await transaction.get(characterRef);
        if (!charDoc.exists || !charDoc.data()?.publicStatus) {
            throw new Error('Character not found or is not public.');
        }

        const charData = charDoc.data();
        if (charData?.likedBy?.includes(ctx.user!.uid)) {
          return; // User has already liked this
        }
        
        transaction.update(characterRef, {
          likes: FieldValue.increment(1),
          likedBy: FieldValue.arrayUnion(ctx.user!.uid),
        });

        if (charData.userId) {
            const userRef = db.collection('users').doc(charData.userId);
            transaction.update(userRef, {
                totalLikes: FieldValue.increment(1)
            });
        }
      });
      
      return { success: true };
    }),

  unlikeCharacter: privateProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
       const characterRef = db.collection('characters').doc(input.characterId);

       await db.runTransaction(async (transaction) => {
        const charDoc = await transaction.get(characterRef);
        if (!charDoc.exists) {
            throw new Error('Character not found.');
        }
        
        const charData = charDoc.data();
        if (!charData?.likedBy?.includes(ctx.user!.uid)) {
          return; // User hasn't liked this, nothing to do
        }
        
        transaction.update(characterRef, {
          likes: FieldValue.increment(-1),
          likedBy: FieldValue.arrayRemove(ctx.user!.uid),
        });

        if (charData.userId) {
            const userRef = db.collection('users').doc(charData.userId);
             transaction.update(userRef, {
                totalLikes: FieldValue.increment(-1)
            });
        }
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
                userId: ctx.user!.uid,
                characterIds: [],
                createdAt: FieldValue.serverTimestamp(),
            };
            const collectionRef = await db.collection('collections').add(collectionData);
            return { id: collectionRef.id, ...collectionData };
        }),
    list: privateProcedure.query(async ({ ctx }) => {
        const snapshot = await db
            .collection('collections')
            .where('userId', '==', ctx.user!.uid)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => CollectionSchema.parse({ id: doc.id, ...doc.data() }));
    }),
    get: privateProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const collectionDoc = await db.collection('collections').doc(input.id).get();
            if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user!.uid) {
                throw new Error('Collection not found or access denied.');
            }
            const collectionData = CollectionSchema.parse({ id: collectionDoc.id, ...collectionDoc.data() });

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
             if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user!.uid) {
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
             if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user!.uid) {
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
            if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user!.uid) {
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
            if (!collectionDoc.exists || collectionDoc.data()?.userId !== ctx.user!.uid) {
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
        const charactersPromise = db.collection('characters').count().get();

        const [listUsersResult, charactersSnapshot] = await Promise.all([
            usersPromise,
            charactersSnapshot,
        ]);

        const totalUsers = listUsersResult.users.length;
        const totalCharacters = charactersSnapshot.data().count;

        return { totalUsers, totalCharacters };
    }),
});

export const appRouter = router({
  user: userRouter,
  datapack: dataPackRouter,
  character: characterRouter,
  collection: collectionRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
