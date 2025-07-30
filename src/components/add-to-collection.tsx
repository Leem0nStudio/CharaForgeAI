"use client";

import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

type AddToCollectionProps = {
  characterId: string;
};

export function AddToCollection({ characterId }: AddToCollectionProps) {
  const { toast } = useToast();
  const { data: collections, isLoading } = trpc.collection.list.useQuery();
  const addMutation = trpc.collection.addCharacter.useMutation({
    onSuccess: (data, variables) => {
        const collectionName = collections?.find(c => c.id === variables.collectionId)?.name;
        toast({
            title: "Character Added",
            description: `Added to collection: ${collectionName}`
        })
    },
    onError: (error) => {
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message
        });
    }
  });

  const handleAddToCollection = (collectionId: string) => {
    addMutation.mutate({ collectionId, characterId });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add to Collection</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Add to Collection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : collections && collections.length > 0 ? (
          collections.map((collection) => (
            <DropdownMenuItem
              key={collection.id}
              onClick={() => handleAddToCollection(collection.id)}
              disabled={addMutation.isPending}
            >
              {collection.name}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No collections found.</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
