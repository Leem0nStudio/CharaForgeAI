"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/server";

type Creator = inferRouterOutputs<AppRouter["user"]["getTopCreators"]>[number];

export function TopCreators() {
  const {
    data: creators,
    isLoading,
    error,
  } = trpc.user.getTopCreators.useQuery({ limit: 4 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-destructive text-center col-span-full">
        Error loading creators: {error.message}
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {creators?.map((creator) => (
        <Card key={creator.uid} className="flex items-center p-4 gap-4 bg-secondary/20 hover:bg-secondary/40 transition-colors">
          <Avatar className="h-12 w-12 border-2 border-primary/50">
            <AvatarImage src={creator.photoURL ?? ""} />
            <AvatarFallback>{creator.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold truncate">{creator.displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {creator.totalLikes} Likes
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
