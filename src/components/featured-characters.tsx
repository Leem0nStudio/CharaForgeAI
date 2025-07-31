"use client";

import { trpc } from "@/lib/trpc/client";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/server";

type Character = inferRouterOutputs<
  AppRouter["character"]["getTopCharacters"]
>[number];

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
        <Card
          key={character.id}
          className="overflow-hidden transition-transform transform hover:-translate-y-1 group border-transparent hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40"
        >
          <Image
            src={character.imageUrl}
            alt={`Image of ${character.name}`}
            width={512}
            height={512}
            className="w-full h-48 object-cover"
          />
          <CardHeader>
            <CardTitle className="font-headline truncate">
              {character.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-muted-foreground text-sm">
              <Heart className="w-4 h-4 mr-2 fill-red-500 text-red-500" />
              <span>{character.likes} Likes</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
