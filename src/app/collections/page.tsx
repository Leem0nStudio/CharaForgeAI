"use client";

import { Header } from "@/components/header";
import { CollectionsList } from "@/components/collections-list";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function CollectionsPage() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="p-4 md:p-8">
                 <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold font-headline">Your Collections</h2>
                    <p className="text-muted-foreground">Curate your own galleries of characters.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p>Loading...</p>
                    </div>
                ) : user ? (
                    <CollectionsList />
                ) : (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-bold">Access Denied</h2>
                        <p className="text-muted-foreground mt-2">
                            Please sign in to view your collections.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
