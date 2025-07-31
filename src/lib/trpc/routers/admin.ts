import { router, adminProcedure } from '../trpc';
import { db, auth } from '@/lib/firebase/server';

export const adminRouter = router({
    getStats: adminProcedure.query(async () => {
        const usersPromise = auth.listUsers();
        const charactersPromise = db.collection('characters').get();
        const datapacksCountPromise = db.collection('datapacks').count().get();


        const [listUsersResult, charactersSnapshot, datapacksSnapshot] = await Promise.all([
            usersPromise,
            charactersPromise,
            datapacksCountPromise,
        ]);

        const totalUsers = listUsersResult.users.length;
        const totalCharacters = charactersSnapshot.size;
        const totalLikes = charactersSnapshot.docs.reduce((acc, doc) => acc + (doc.data().likes || 0), 0);
        const totalDataPacks = datapacksSnapshot.data().count;


        return { totalUsers, totalCharacters, totalLikes, totalDataPacks };
    }),
});
