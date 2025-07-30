"use client";

import { Header } from "@/components/header";
import { PublicGallery } from "@/components/public-gallery";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ExplorePage() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="p-4 md:p-8">
                 <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold font-headline">Public Gallery</h2>
                    <p className="text-muted-foreground">Explore characters created by the community.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p>Loading...</p>
                    </div>
                ) : (
                    <PublicGallery />
                )}
            </main>
        </div>
    );
}
