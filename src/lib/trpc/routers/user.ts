import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { router, publicProcedure, privateProcedure } from '../trpc';
import { db, auth } from '@/lib/firebase/server';
import { TRPCError } from '@trpc/server';

const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.boolean().default(true),
  privacy: z.enum(['public', 'private']).default('public'),
});

const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  purchasedPacks: z.array(z.string()).default([]),
  installedPacks: z.array(z.string()).default(['core_base_styles']),
  subscriptionTier: z.enum(['free', 'premium', 'enterprise']).default('free'),
  totalLikes: z.number().default(0),
  isActive: z.boolean().default(true),
  preferences: UserPreferencesSchema.default({}),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

const UserUpdateSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50, "Display name must be less than 50 characters."),
  preferences: UserPreferencesSchema.partial().optional(),
});

const UserPreferencesUpdateSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.boolean().optional(),
  privacy: z.enum(['public', 'private']).optional(),
});

export const userRouter = router({
  getUser: privateProcedure.query(async ({ ctx }) => {
    try {
      const userRef = db.collection('users').doc(ctx.user!.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User document not found in Firestore. Please sign out and sign in again.',
        });
      }
      
      const data = userDoc.data()!;
      
      // Auto-correction for missing or invalid data
      const updates: any = {};
      let needsUpdate = false;
      
      // Ensure core pack is installed
      if (!data.installedPacks || !data.installedPacks.includes('core_base_styles')) {
        updates.installedPacks = [...(data.installedPacks || []), 'core_base_styles'];
        needsUpdate = true;
      }
      
      // Ensure totalLikes exists
      if (typeof data.totalLikes === 'undefined') {
        updates.totalLikes = 0;
        needsUpdate = true;
      }
      
      // Ensure isActive exists
      if (typeof data.isActive === 'undefined') {
        updates.isActive = true;
        needsUpdate = true;
      }
      
      // Ensure preferences exist
      if (!data.preferences) {
        updates.preferences = {
          theme: 'system',
          notifications: true,
          privacy: 'public'
        };
        needsUpdate = true;
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        updates.updatedAt = FieldValue.serverTimestamp();
        await userRef.update(updates);
        // Merge updates into data
        Object.assign(data, updates);
      }

      return UserSchema.parse(data);
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Error fetching user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user data',
      });
    }
  }),

  updateUser: privateProcedure
    .input(UserUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const userRef = db.collection('users').doc(ctx.user!.uid);
        
        // Check if user document exists
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User document not found',
          });
        }

        const updateData: any = {
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Update display name if provided
        if (input.displayName) {
          updateData.displayName = input.displayName;
          
          // Also update Firebase Auth
          try {
            await auth.updateUser(ctx.user!.uid, {
              displayName: input.displayName,
            });
          } catch (authError) {
            console.error('Error updating Firebase Auth:', authError);
            // Continue with Firestore update even if Auth update fails
          }
        }

        // Update preferences if provided
        if (input.preferences) {
          const currentData = userDoc.data();
          const currentPreferences = currentData?.preferences || {};
          updateData.preferences = { ...currentPreferences, ...input.preferences };
        }

        // Update Firestore
        await userRef.update(updateData);
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Error updating user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
        });
      }
    }),

  updatePreferences: privateProcedure
    .input(UserPreferencesUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const userRef = db.collection('users').doc(ctx.user!.uid);
        
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User document not found',
          });
        }

        const currentData = userDoc.data();
        const currentPreferences = currentData?.preferences || {};
        
        await userRef.update({
          preferences: { ...currentPreferences, ...input },
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Error updating preferences:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update preferences',
        });
      }
    }),

  deleteUser: privateProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = ctx.user!.uid;
      
      // First, soft delete by marking as inactive
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        isActive: false,
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Delete related data (characters, collections)
      const batch = db.batch();
      
      // Delete user's characters
      const charactersSnapshot = await db.collection('characters')
        .where('userId', '==', userId)
        .get();
      
      charactersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete user's collections
      const collectionsSnapshot = await db.collection('collections')
        .where('userId', '==', userId)
        .get();
      
      collectionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Finally, delete from Firebase Auth
      await auth.deleteUser(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete user account',
      });
    }
  }),

  installDataPack: privateProcedure
    .input(z.object({ packId: z.string().min(1, 'Pack ID is required') }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userRef = db.collection('users').doc(ctx.user!.uid);
        
        // Check if user exists
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User document not found',
          });
        }

        // Check if pack is already installed
        const userData = userDoc.data();
        if (userData?.installedPacks?.includes(input.packId)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'DataPack is already installed',
          });
        }

        // Verify the datapack exists
        const packDoc = await db.collection('datapacks').doc(input.packId).get();
        if (!packDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'DataPack not found',
          });
        }

        await userRef.update({
          installedPacks: FieldValue.arrayUnion(input.packId),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Error installing datapack:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to install DataPack',
        });
      }
    }),

  uninstallDataPack: privateProcedure
    .input(z.object({ packId: z.string().min(1, 'Pack ID is required') }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.packId === 'core_base_styles') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot uninstall core system pack',
          });
        }

        const userRef = db.collection('users').doc(ctx.user!.uid);
        
        // Check if user exists
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User document not found',
          });
        }

        // Check if pack is installed
        const userData = userDoc.data();
        if (!userData?.installedPacks?.includes(input.packId)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'DataPack is not installed',
          });
        }

        await userRef.update({
          installedPacks: FieldValue.arrayRemove(input.packId),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Error uninstalling datapack:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to uninstall DataPack',
        });
      }
    }),

  getTopCreators: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }))
    .query(async ({ input }) => {
      try {
        const limit = input?.limit ?? 10;
        
        const usersSnapshot = await db
          .collection('users')
          .where('isActive', '==', true)
          .where('preferences.privacy', '==', 'public')
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
            displayName: data.displayName || 'Anonymous Creator',
            photoURL: data.photoURL || null,
            totalLikes: data.totalLikes || 0,
          };
        });

        return creators;
      } catch (error) {
        console.error('Error fetching top creators:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch top creators',
        });
      }
    }),

  getUserStats: privateProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user!.uid;
      
      // Get user data
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const userData = userDoc.data()!;

      // Get character count
      const charactersSnapshot = await db.collection('characters')
        .where('userId', '==', userId)
        .get();

      // Get collection count
      const collectionsSnapshot = await db.collection('collections')
        .where('userId', '==', userId)
        .get();

      return {
        totalLikes: userData.totalLikes || 0,
        charactersCreated: charactersSnapshot.size,
        collectionsCreated: collectionsSnapshot.size,
        installedPacks: userData.installedPacks?.length || 0,
        subscriptionTier: userData.subscriptionTier || 'free',
        memberSince: userData.createdAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Error fetching user stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user statistics',
      });
    }
  }),
});
