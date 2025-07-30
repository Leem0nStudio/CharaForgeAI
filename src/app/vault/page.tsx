"use client";

import { Header } from "@/components/header";
import { CharacterVault } from "@/components/character-vault";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function VaultPage() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="p-4 md:p-8">
                 <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold font-headline">Character Vault</h2>
                    <p className="text-muted-foreground">Your private collection of forged characters.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p>Loading...</p>
                    </div>
                ) : user ? (
                    <CharacterVault />
                ) : (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-bold">Access Denied</h2>
                        <p className="text-muted-foreground mt-2">
                            Please sign in to view your character vault.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
