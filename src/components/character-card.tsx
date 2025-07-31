
"use client";

import Image from "next/image";
import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/server";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart, Lock, Globe } from "lucide-react";

// Define a generic character type that can be sourced from different procedures
type Character = 
    inferRouterOutputs<AppRouter["character"]["listUserCharacters"]>[number] | 
    inferRouterOutputs<AppRouter["character"]["listPublicCharacters"]>[number] |
    inferRouterOutputs<AppRouter["character"]["getTopCharacters"]>[number];


type CharacterCardProps = {
  character: Character;
  children?: React.ReactNode; // For action buttons in the footer
  overlay?: React.ReactNode; // For overlays on the image
};

export function CharacterCard({ character, children, overlay }: CharacterCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden group transition-all duration-300 bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-primary/50 hover:shadow-primary/20 hover:shadow-lg">
      <div className="relative">
        <Image
          src={character.imageUrl}
          alt={`Image of ${character.name}`}
          width={512}
          height={512}
          className="w-full h-auto aspect-square object-cover"
        />
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {overlay}
        </div>
        {'publicStatus' in character && (
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
        )}
         <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-black/50 text-white">
            <Heart className="h-3 w-3" />
            <span>{character.likes}</span>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="font-headline truncate">{character.name}</CardTitle>
      </CardHeader>
      {'bio' in character && character.bio && (
         <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-3">
                {character.bio}
            </p>
        </CardContent>
      )}
      {children && (
        <CardFooter className="flex justify-end gap-2">
            {children}
        </CardFooter>
      )}
    </Card>
  );
}
