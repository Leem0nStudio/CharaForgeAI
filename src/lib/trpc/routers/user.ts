import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { router, publicProcedure, privateProcedure } from '../trpc';
import { db, auth } from '@/lib/firebase/server';

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

const UserUpdateSchema = z.object({
    displayName: z.string().min(2, "Display name must be at least 2 characters."),
});

export const userRouter = router({
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

      // Update Firebase Auth
      await auth.updateUser(ctx.user!.uid, {
        displayName: input.displayName,
      });

      // Update Firestore
      await userRef.update({ 
          displayName: input.displayName,
          updatedAt: FieldValue.serverTimestamp(),
      });
      
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
