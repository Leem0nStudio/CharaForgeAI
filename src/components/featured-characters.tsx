
"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { CharacterCard } from "./character-card";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/server";

type Character = inferRouterOutputs<AppRouter["character"]["getTopCharacters"]>[number];

type FeaturedCharactersProps = {
  initialData: Character[];
};

export function FeaturedCharacters({ initialData }: FeaturedCharactersProps) {
  const {
    data: characters,
    isLoading,
    error,
  } = trpc.character.getTopCharacters.useQuery(
    { limit: 4 },
    {
      initialData: initialData,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

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
