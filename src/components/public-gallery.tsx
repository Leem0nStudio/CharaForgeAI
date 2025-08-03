
"use client";

import { trpc } from "@/lib/trpc/client";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { AddToCollection } from "./add-to-collection";
import { CharacterCard } from "./character-card";

export function PublicGallery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: characters, isLoading, error } =
    trpc.character.listPublicCharacters.useQuery({ limit: 50 });

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="bg-secondary/20">
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
      <div className="text-center py-16 border-2 border-dashed rounded-lg border-border/50">
        <h3 className="text-xl font-semibold">The Gallery is Empty</h3>
        <p className="text-muted-foreground mt-2">
          Be the first to make a character public!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {characters.map((character) => {
        const isLiked = user ? character.likedBy.includes(user.uid) : false;

        return (
          <CharacterCard
            key={character.id}
            character={character}
            overlay={user && <AddToCollection characterId={character.id} />}
          >
             <Button
                variant="outline"
                className="w-full"
                onClick={() => handleLikeToggle(character.id, isLiked)}
                disabled={likeMutation.isPending || unlikeMutation.isPending || !user}
              >
                <Heart className={`mr-2 h-4 w-4 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {character.likes} {character.likes === 1 ? "Like" : "Likes"}
              </Button>
          </CharacterCard>
        );
      })}
    </div>
  );
}
