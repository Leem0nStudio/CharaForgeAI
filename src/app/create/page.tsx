"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Header } from "@/components/header";
import { CharacterCreator } from "@/components/character-creator";

export default function CreatePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="p-4 md:p-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        ) : user ? (
          <CharacterCreator />
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold">Please Sign In</h2>
            <p className="text-muted-foreground mt-2">
              You need to be signed in to create new characters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
