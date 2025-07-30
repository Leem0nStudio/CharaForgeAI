"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import Image from "next/image";
import { Edit, Trash2, Globe, Lock, Heart, Plus } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditCharacterForm } from "@/components/edit-character-form";
import { AddToCollection } from "@/components/add-to-collection";
import type { AppRouter } from "@/lib/trpc/server";
import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";

type Character = inferRouterOutputs<AppRouter["character"]["listUserCharacters"]>[number];

export function CharacterVault() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  const { data: characters, isLoading, error } =
    trpc.character.listUserCharacters.useQuery(undefined, {
      enabled: !!user,
    });

  const deleteMutation = trpc.character.deleteCharacter.useMutation({
    onSuccess: () => {
      utils.character.listUserCharacters.invalidate();
      toast({
        title: "Character Deleted",
        description: "The character has been removed from your vault.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message,
      });
    },
  });

  const handleDelete = (characterId: string) => {
    deleteMutation.mutate({ id: characterId });
  };

  const handleEditClick = (character: Character) => {
    setSelectedCharacter(character);
    setIsEditDialogOpen(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-secondary/20">
            <Skeleton className="h-64 w-full" />
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
            <CardFooter className="gap-2">
              <Skeleton className="h-10 w-full" />
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
        <h3 className="text-xl font-semibold">Your Vault is Empty</h3>
        <p className="text-muted-foreground mt-2">
          Go to the <Link href="/create" className="text-primary hover:underline">Character Creator</Link> to forge your first character!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {characters.map((character) => (
          <Card key={character.id} className="flex flex-col overflow-hidden group transition-all duration-300 bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-primary/50 hover:shadow-primary/20 hover:shadow-lg">
            <div className="relative">
              <Image
                src={character.imageUrl}
                alt={`Image of ${character.name}`}
                width={512}
                height={512}
                className="w-full h-auto aspect-square object-cover"
              />
              <div
                className={`absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white ${
                  character.publicStatus ? "bg-green-600" : "bg-gray-600"
                }`}
              >
                {character.publicStatus ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                <span>{character.publicStatus ? "Public" : "Private"}</span>
              </div>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-black/50 text-white">
                  <Heart className="h-3 w-3" />
                  <span>{character.likes}</span>
              </div>
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
            <CardFooter className="flex justify-end gap-2">
               <Button variant="outline" size="sm" onClick={() => handleEditClick(character)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your character from the vault.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(character.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {selectedCharacter && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {selectedCharacter.name}</DialogTitle>
                </DialogHeader>
                <EditCharacterForm
                    character={selectedCharacter}
                    onFinished={() => setIsEditDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
