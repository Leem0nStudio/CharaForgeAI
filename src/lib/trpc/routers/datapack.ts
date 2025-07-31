import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { router, publicProcedure, privateProcedure, adminProcedure } from '../trpc';
import { db } from '@/lib/firebase/server';
import { getStorage } from 'firebase-admin/storage';
import { TRPCError } from '@trpc/server';

const DataPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  premiumStatus: z.enum(['free', 'purchased', 'subscription']),
  coverImageUrl: z.string().url().optional(),
  content: z.array(z.object({
    type: z.string(),
    reference: z.string(),
  })).optional(),
  promptTemplate: z.string().optional(),
  createdAt: z.any().optional(),
});

const CreateDataPackInputSchema = DataPackSchema.omit({id: true, createdAt: true, promptTemplate: true, coverImageUrl: true}).extend({
    promptTemplateContent: z.string().optional(),
    coverImage: z.string().optional(), // base64 data URI
});

const ensureCoreDataPackExists = async () => {
    const corePackRef = db.collection('datapacks').doc('core_base_styles');
    const corePackDoc = await corePackRef.get();
    if (!corePackDoc.exists) {
        await corePackRef.set({
            name: 'Core Base Styles',
            description: 'A fundamental pack for basic character creation without a specific template. Freely describe your character.',
            premiumStatus: 'free',
            coverImageUrl: 'https://placehold.co/512x512.png',
            content: [],
            promptTemplate: '',
            createdAt: FieldValue.serverTimestamp(),
        });
        console.log('Core Base Styles DataPack created.');
    }
};

export const dataPackRouter = router({
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
        const { promptTemplateContent, coverImage, ...packData } = input;
        
        const packRef = db.collection('datapacks').doc();
        const packId = packRef.id;
        
        let promptTemplateUrl = '';
        let coverImageUrl = '';
        const bucket = getStorage().bucket();

        if (promptTemplateContent && promptTemplateContent.trim() !== '') {
            const filePath = `datapacks/${packId}/prompt_template.yaml`;
            const file = bucket.file(filePath);

            await file.save(promptTemplateContent, {
                contentType: 'text/yaml',
                gzip: true,
            });
            promptTemplateUrl = `gs://${bucket.name}/${filePath}`;
        }
        
        if (coverImage) {
            const imageMatch = coverImage.match(/^data:(image\/(\w+));base64,(.+)$/);
            if (!imageMatch) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cover image format.' });
            }
            const [, mimeType, extension, base64Data] = imageMatch;
            const buffer = Buffer.from(base64Data, 'base64');
            const imagePath = `datapacks/${packId}/cover.${extension}`;
            const file = bucket.file(imagePath);

            await file.save(buffer, {
                metadata: { contentType: mimeType },
                public: true, // Make file publicly accessible
            });

            coverImageUrl = file.publicUrl();
        }
        
        await packRef.set({
            ...packData,
            coverImageUrl,
            content: [], // content is deprecated but kept for schema compatibility
            promptTemplate: promptTemplateUrl,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, id: packId };
    }),
    listAll: adminProcedure.query(async () => {
      await ensureCoreDataPackExists();
      const packsSnapshot = await db.collection('datapacks').orderBy('createdAt', 'desc').get();
      return packsSnapshot.docs.map(doc => DataPackSchema.parse({ id: doc.id, ...doc.data() }));
    }),
    getByIds: privateProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(async ({ input }) => {
      if (input.ids.length === 0) {
        return [];
      }
      const packsSnapshot = await db
        .collection('datapacks')
        .where(FieldValue.documentId(), 'in', input.ids)
        .get();
      
      const packs = packsSnapshot.docs.map(doc => DataPackSchema.parse({ id: doc.id, ...doc.data() }));
      return packs;
  }),
});
