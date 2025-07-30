import { router, adminProcedure } from '../trpc';
import { db, auth } from '@/lib/firebase/server';

export const adminRouter = router({
    getStats: adminProcedure.query(async () => {
        const usersPromise = auth.listUsers();
        const charactersCountPromise = db.collection('characters').count().get();

        const [listUsersResult, charactersSnapshot] = await Promise.all([
            usersPromise,
            charactersCountPromise,
        ]);

        const totalUsers = listUsersResult.users.length;
        const totalCharacters = charactersSnapshot.data().count;

        return { totalUsers, totalCharacters };
    }),
});
