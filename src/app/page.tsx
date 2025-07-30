"use client";

import { Header } from "@/components/header";
import { trpc } from "@/lib/trpc/client";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, Users, Package, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/server";
import { DataPackStore } from "@/components/data-pack-store";

type Character = inferRouterOutputs<
  AppRouter["character"]["getTopCharacters"]
>[number];
type Creator = inferRouterOutputs<AppRouter["user"]["getTopCreators"]>[number];

function FeaturedCharacters() {
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
        Error al cargar los personajes: {error.message}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {characters?.map((character) => (
        <Card
          key={character.id}
          className="overflow-hidden transition-transform transform hover:-translate-y-1"
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

function TopCreators() {
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
        Error al cargar los creadores: {error.message}
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {creators?.map((creator) => (
        <Card key={creator.uid} className="flex items-center p-4 gap-4">
          <Avatar className="h-12 w-12">
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


export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <section className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
            Bienvenido a CharaForge AI
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Tu taller de creatividad para dar vida a personajes únicos con el poder de la inteligencia artificial. Explora, crea y comparte.
          </p>
          <Button asChild size="lg">
            <Link href="/create">
              Comienza a Crear
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </section>

        <section className="mb-12 md:mb-16">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl md:text-3xl font-bold font-headline flex items-center">
              <Heart className="mr-3 h-7 w-7 text-primary" />
              Personajes Destacados
            </h2>
            <Button variant="outline" asChild>
                <Link href="/explore">Ver Galería <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <FeaturedCharacters />
        </section>

        <section className="mb-12 md:mb-16">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl md:text-3xl font-bold font-headline flex items-center">
                <Users className="mr-3 h-7 w-7 text-primary" />
                Creadores Top
            </h2>
          </div>
          <TopCreators />
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl md:text-3xl font-bold font-headline flex items-center">
                <Package className="mr-3 h-7 w-7 text-primary" />
                Nuevos DataPacks
            </h2>
          </div>
          <DataPackStore />
        </section>
      </main>
    </div>
  );
}
