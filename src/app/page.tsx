"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Header } from "@/components/header";
import { CharacterCreator } from "@/components/character-creator";
import { CharacterVault } from "@/components/character-vault";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          <Tabs defaultValue="creator" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList>
                <TabsTrigger value="creator">Character Creator</TabsTrigger>
                <TabsTrigger value="vault">Character Vault</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="creator">
              <CharacterCreator />
            </TabsContent>
            <TabsContent value="vault">
              <CharacterVault />
            </TabsContent>
          </Tabs>
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
