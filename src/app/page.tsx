
import { Header } from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, Users, Package, ArrowRight } from "lucide-react";
import { DataPackStore } from "@/components/data-pack-store";
import { FeaturedCharacters } from "@/components/featured-characters";
import { TopCreators } from "@/components/top-creators";
import { appRouter } from "@/lib/trpc/server";
import { createContext } from "@/lib/trpc/trpc";
import { headers } from "next/headers";

export default async function Home() {
  const trpc = appRouter.createCaller(await createContext({ headers: headers() }));
  
  const [topCharacters, topCreators] = await Promise.all([
    trpc.character.getTopCharacters({ limit: 4 }),
    trpc.user.getTopCreators({ limit: 4 })
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <section className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4 bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">
            Welcome to CharaForge AI
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Your creative workshop to bring unique characters to life with the power of artificial intelligence. Explore, create, and share.
          </p>
          <Button asChild size="lg">
            <Link href="/create">
              Start Creating
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </section>

        <section className="mb-12 md:mb-16">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl md:text-3xl font-bold font-headline flex items-center">
              <Heart className="mr-3 h-7 w-7 text-primary" />
              Featured Characters
            </h2>
            <Button variant="outline" asChild>
                <Link href="/explore">View Gallery <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <FeaturedCharacters initialData={topCharacters} />
        </section>

        <section className="mb-12 md:mb-16">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl md:text-3xl font-bold font-headline flex items-center">
                <Users className="mr-3 h-7 w-7 text-primary" />
                Top Creators
            </h2>
          </div>
          <TopCreators initialData={topCreators} />
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl md:text-3xl font-bold font-headline flex items-center">
                <Package className="mr-3 h-7 w-7 text-primary" />
                New DataPacks
            </h2>
          </div>
          <DataPackStore />
        </section>
      </main>
    </div>
  );
}
