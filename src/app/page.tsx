import { CharacterCreator } from "@/components/character-creator";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-6 px-4 md:px-8 border-b shadow-sm">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">
          CharaForge AI
        </h1>
        <p className="text-muted-foreground mt-1">
          Craft unique characters with the power of AI
        </p>
      </header>
      <main className="p-4 md:p-8">
        <CharacterCreator />
      </main>
    </div>
  );
}
