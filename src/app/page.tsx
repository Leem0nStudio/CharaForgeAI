"use client";

import { CharacterCreator } from "@/components/character-creator";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="p-4 md:p-8">
        <CharacterCreator />
      </main>
    </div>
  );
}