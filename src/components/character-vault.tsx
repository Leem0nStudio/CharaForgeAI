
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
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
import { CharacterCard } from "./character-card";

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
            <Skeleton className="h-10 w-full m-6 mt-0" />
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
          <CharacterCard 
            key={character.id} 
            character={character}
            overlay={<AddToCollection characterId={character.id} />}
          >
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
          </CharacterCard>
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
