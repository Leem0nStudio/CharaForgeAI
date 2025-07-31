
"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { CharacterCard } from "./character-card";

export function FeaturedCharacters() {
  const {
    data: characters,
    isLoading,
    error,
  } = trpc.character.getTopCharacters.useQuery({ limit: 4 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-center col-span-full">
        Error loading characters: {error.message}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {characters?.map((character) => (
        <CharacterCard key={character.id} character={character} />
      ))}
    </div>
  );
}
