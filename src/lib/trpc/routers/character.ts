import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { router, publicProcedure, privateProcedure } from '../trpc';
import { db } from '@/lib/firebase/server';

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

export const characterRouter = router({
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
