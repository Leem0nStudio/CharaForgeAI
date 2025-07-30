"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Header } from "@/components/header";

export default function Home() {
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
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold">Welcome, {user.displayName}!</h2>
            <p className="text-muted-foreground mt-2">
              You are signed in. Start creating your characters.
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold">Welcome to CharaForge AI</h2>
            <p className="text-muted-foreground mt-2">
              Please sign in to start creating your characters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
