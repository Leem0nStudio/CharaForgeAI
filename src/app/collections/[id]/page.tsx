"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Heart, Plus } from "lucide-react";
import { AddToCollection } from "@/components/add-to-collection";

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  
  const { data: collection, isLoading, error } = trpc.collection.get.useQuery({ id: params.id });

  const removeCharacterMutation = trpc.collection.removeCharacter.useMutation({
    onSuccess: () => {
        utils.collection.get.invalidate({ id: params.id });
        toast({
            title: "Character Removed",
            description: "The character has been removed from this collection."
        })
    },
    onError: (err) => {
        toast({
            variant: "destructive",
            title: "Error",
            description: err.message,
        })
    }
  });

  const handleRemove = (characterId: string) => {
    removeCharacterMutation.mutate({ collectionId: params.id, characterId });
  };

  if (isLoading) {
    return (
       <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="p-4 md:p-8">
             <div className="mb-8 text-center">
                <Skeleton className="h-10 w-1/2 mx-auto" />
                <Skeleton className="h-5 w-1/3 mx-auto mt-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <Skeleton className="h-64 w-full" />
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                    </Card>
                ))}
            </div>
        </main>
      </div>
    )
  }

  if (error) {
     return (
       <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="p-4 md:p-8">
            <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-destructive">Error</h2>
                <p className="text-muted-foreground mt-2">{error.message}</p>
                 <Button asChild className="mt-4">
                    <Link href="/collections">Back to Collections</Link>
                </Button>
            </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="p-4 md:p-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold font-headline">{collection?.name}</h2>
          {collection?.description && <p className="text-muted-foreground">{collection.description}</p>}
        </div>

        {collection?.characters && collection.characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {collection.characters.map((character) => (
              <Card key={character.id} className="flex flex-col overflow-hidden group">
                <div className="relative">
                  <Image
                    src={character.imageUrl}
                    alt={`Image of ${character.name}`}
                    width={512}
                    height={512}
                    className="w-full h-auto aspect-square object-cover"
                  />
                   <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-black/50 text-white">
                      <Heart className="h-3 w-3" />
                      <span>{character.likes}</span>
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
                    variant="destructive" 
                    className="w-full" 
                    onClick={() => handleRemove(character.id)}
                    disabled={removeCharacterMutation.isPending && removeCharacterMutation.variables?.characterId === character.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">This Collection is Empty</h3>
            <p className="text-muted-foreground mt-2">
              You can add characters from the <Link href="/explore" className="text-primary hover:underline">Public Gallery</Link> or your <Link href="/vault" className="text-primary hover:underline">Vault</Link>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
