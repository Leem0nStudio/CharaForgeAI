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

const UpdateDataPackInputSchema = CreateDataPackInputSchema.extend({
    id: z.string(),
});


const ensureCoreDataPackExists = async () => {
    const corePackRef = db.collection('datapacks').doc('core_base_styles');
    const corePackDoc = await corePackRef.get();
    if (!corePackDoc.exists) {
        await corePackRef.set({
            name: 'Core Base Styles',
            description: 'A fundamental pack for basic character creation without a specific template. Freely describe your character.',
            premiumStatus: 'free',
            coverImageUrl: 'https://placehold.co/512x288.png',
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
        await ensureCoreDataPacksExist();
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
    update: adminProcedure
    .input(UpdateDataPackInputSchema)
    .mutation(async ({ input }) => {
        const { id, promptTemplateContent, coverImage, ...packData } = input;
        const packRef = db.collection('datapacks').doc(id);

        const doc = await packRef.get();
        if (!doc.exists) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'DataPack not found.' });
        }

        const bucket = getStorage().bucket();
        let promptTemplateUrl = doc.data()?.promptTemplate || '';
        let coverImageUrl = doc.data()?.coverImageUrl || '';

        // Update prompt template if new content is provided
        if (typeof promptTemplateContent !== 'undefined') {
            const filePath = `datapacks/${id}/prompt_template.yaml`;
            const file = bucket.file(filePath);
            if (promptTemplateContent.trim() !== '') {
                await file.save(promptTemplateContent, { contentType: 'text/yaml', gzip: true });
                promptTemplateUrl = `gs://${bucket.name}/${filePath}`;
            } else {
                 // Delete the file if content is empty
                try { await file.delete(); } catch(e) {}
                promptTemplateUrl = '';
            }
        }

        // Update cover image if a new image is provided
        if (coverImage) {
            const imageMatch = coverImage.match(/^data:(image\/(\w+));base64,(.+)$/);
            if (!imageMatch) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cover image format.' });
            }
            const [, mimeType, extension, base64Data] = imageMatch;
            const buffer = Buffer.from(base64Data, 'base64');
            const imagePath = `datapacks/${id}/cover.${extension}`;
            const file = bucket.file(imagePath);
            await file.save(buffer, { metadata: { contentType: mimeType }, public: true });
            coverImageUrl = file.publicUrl();
        }
        
        await packRef.update({
            ...packData,
            coverImageUrl,
            promptTemplate: promptTemplateUrl,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, id };
    }),
    listAll: adminProcedure.query(async () => {
      await ensureCoreDataPacksExist();
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
        .where('__name__', 'in', input.ids)
        .get();
      
      const packs = packsSnapshot.docs.map(doc => DataPackSchema.parse({ id: doc.id, ...doc.data() }));
      
       // Add core pack if it's missing from the user's list but they have none
      if (input.ids.length > 0 && !packs.some(p => p.id === 'core_base_styles')) {
        const corePackRef = db.collection('datapacks').doc('core_base_styles');
        const corePackDoc = await corePackRef.get();
        if (corePackDoc.exists) {
            packs.push(DataPackSchema.parse({ id: corePackDoc.id, ...corePackDoc.data() }));
        }
      }

      return packs;
  }),
  // This procedure is used to get the template content for a specific pack
  getTemplateContent: adminProcedure
    .input(z.object({ packId: z.string() }))
    .query(async ({ input }) => {
        const packDoc = await db.collection('datapacks').doc(input.packId).get();
        if (!packDoc.exists) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'DataPack not found.'});
        }
        
        const promptTemplateUrl = packDoc.data()?.promptTemplate;
        if (!promptTemplateUrl) {
            return { content: '' };
        }

        try {
            const bucket = getStorage().bucket();
            const filePath = `datapacks/${input.packId}/prompt_template.yaml`;
            const file = bucket.file(filePath);

            const [exists] = await file.exists();
            if (!exists) return { content: '' };

            const [data] = await file.download();
            return { content: data.toString('utf-8') };
        } catch (error) {
            console.error("Failed to fetch template content from GCS:", error);
            // It might not exist, which is fine.
            return { content: '' };
        }
    }),
});

const ensureCoreDataPacksExist = async () => {
    const corePackRef = db.collection('datapacks').doc('core_base_styles');
    const corePackDoc = await corePackRef.get();
    if (!corePackDoc.exists) {
        await corePackRef.set({
            name: 'Core Base Styles',
            description: 'A fundamental pack for basic character creation without a specific template. Freely describe your character.',
            premiumStatus: 'free',
            coverImageUrl: 'https://placehold.co/512x288.png',
            content: [],
            promptTemplate: '',
            createdAt: FieldValue.serverTimestamp(),
        });
    }
};