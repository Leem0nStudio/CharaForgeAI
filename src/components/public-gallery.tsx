"use client";

import { trpc } from "@/lib/trpc/client";
import Image from "next/image";
import { Heart, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddToCollection } from "./add-to-collection";

export function PublicGallery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: characters, isLoading, error } =
    trpc.character.listPublicCharacters.useQuery();

  const likeMutation = trpc.character.likeCharacter.useMutation({
    onSuccess: () => {
      utils.character.listPublicCharacters.invalidate();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const unlikeMutation = trpc.character.unlikeCharacter.useMutation({
     onSuccess: () => {
      utils.character.listPublicCharacters.invalidate();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleLikeToggle = (characterId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not signed in",
        description: "You must be signed in to like a character.",
      });
      return;
    }
    if (isLiked) {
      unlikeMutation.mutate({ characterId });
    } else {
      likeMutation.mutate({ characterId });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-64 w-full" />
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-center">Failed to load characters: {error.message}</p>;
  }
  
  if (!characters || characters.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <h3 className="text-xl font-semibold">The Gallery is Empty</h3>
        <p className="text-muted-foreground mt-2">
          Be the first to make a character public!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {characters.map((character) => {
        const isLiked = user ? character.likedBy.includes(user.uid) : false;

        return (
          <Card key={character.id} className="flex flex-col overflow-hidden group">
            <div className="relative">
              <Image
                src={character.imageUrl}
                alt={`Image of ${character.name}`}
                width={512}
                height={512}
                className="w-full h-auto aspect-square object-cover"
              />
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <AddToCollection characterId={character.id} />
              </div>
            </div>
            <CardHeader>
              <CardTitle className="font-headline truncate">{character.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {character.bio}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleLikeToggle(character.id, isLiked)}
                disabled={likeMutation.isPending || unlikeMutation.isPending}
              >
                <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {character.likes} {character.likes === 1 ? "Like" : "Likes"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
