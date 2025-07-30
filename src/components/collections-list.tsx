"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateCollectionForm } from "./create-collection-form";
import { Plus } from "lucide-react";


export function CollectionsList() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: collections, isLoading, error } =
    trpc.collection.list.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
           <Card key={i}>
             <CardHeader>
               <Skeleton className="h-6 w-3/4" />
               <Skeleton className="h-4 w-1/2 mt-2" />
             </CardHeader>
           </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-center">Failed to load collections: {error.message}</p>;
  }

  return (
    <>
    <div className="flex justify-end mb-4">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Collection
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Collection</DialogTitle>
                </DialogHeader>
                <CreateCollectionForm onFinished={() => setIsCreateOpen(false)} />
            </DialogContent>
        </Dialog>
    </div>

    {collections.length === 0 ? (
         <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No Collections Yet</h3>
            <p className="text-muted-foreground mt-2">
                Click "New Collection" to get started.
            </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {collections.map((collection) => (
          <Link href={`/collections/${collection.id}`} key={collection.id}>
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <CardTitle className="font-headline">{collection.name}</CardTitle>
                <CardDescription>{collection.characterIds.length} {collection.characterIds.length === 1 ? 'character' : 'characters'}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    )}
    </>
  );
}
