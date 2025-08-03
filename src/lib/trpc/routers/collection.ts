import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { router, privateProcedure } from '../trpc';
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


export const collectionRouter = router({
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

            const characterDocs = await db.collection('characters').where('__name__', 'in', collectionData.characterIds).get();
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
