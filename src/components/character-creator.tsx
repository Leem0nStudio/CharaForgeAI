"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Sparkles, Wand2, ArrowLeft, CheckCircle } from "lucide-react";

import { generateCharacterNameAndBio } from "@/ai/flows/generate-character-name-and-bio";
import { generateCharacterImage } from "@/ai/flows/generate-character-image";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  ParsedPromptTemplate,
  parsePromptTemplateYAML,
} from "@/lib/prompt-parser";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PromptBuilder } from "./prompt-builder";

const formSchema = z.object({
  preferences: z.string().min(10, {
    message: "Please describe your character in at least 10 characters.",
  }),
});

type Character = {
  name: string;
  bio: string;
  imageUrl: string;
};

export function CharacterCreator() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<{ id: string; name: string } | null>(null);
  const [promptTemplate, setPromptTemplate] = useState<ParsedPromptTemplate | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: installedPacks, isLoading: arePacksLoading } = trpc.datapack.listInstalled.useQuery(undefined, {
    enabled: !!user,
  });

  const createCharacterMutation = trpc.character.createCharacter.useMutation({
    onSuccess: () => {
      utils.character.listUserCharacters.invalidate();
      toast({
        title: "Character Saved!",
        description: "Your new character has been saved to your vault.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to save character",
        description: error.message,
      });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { preferences: "" },
  });

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!selectedPack) return;

      setIsTemplateLoading(true);
      setPromptTemplate(null);
      try {
        const response = await fetch(`/api/datapacks/${selectedPack.id}/template`);
        if (!response.ok) {
          if (response.status !== 404) { // Ignore 404s, it just means no template
             throw new Error(`Failed to fetch template: ${response.statusText}`);
          }
          setPromptTemplate(null); // Explicitly set to null if not found
          return;
        }
        const yamlText = await response.text();
        if (yamlText.trim() === '') {
            setPromptTemplate(null); // Handle empty template file
            return;
        }
        const parsed = parsePromptTemplateYAML(yamlText);
        setPromptTemplate(parsed);
      } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Could not load DataPack template", description: error.message });
      } finally {
        setIsTemplateLoading(false);
      }
    };
    fetchTemplate();
  }, [selectedPack, toast]);


  async function handleGeneration(
    basePreferences: string,
    promptBuilderResult?: { prompt: string; negativePrompt: string }
  ) {
    if (!user || !selectedPack) {
      toast({ variant: "destructive", title: "Authentication Error" });
      return;
    }

    setIsLoading(true);
    setCharacter(null);

    try {
      const imagePrompt = promptBuilderResult?.prompt || `A fantasy portrait of a character described as: ${basePreferences}. High quality, digital painting, intricate details.`;

      const [nameAndBioResult, imageResult] = await Promise.all([
        generateCharacterNameAndBio({
          userId: user.uid,
          datapackId: selectedPack.id,
          userPreferences: basePreferences,
        }),
        generateCharacterImage({
          userId: user.uid,
          datapackId: selectedPack.id,
          prompt: imagePrompt,
        }),
      ]);

      if (!nameAndBioResult?.name || !nameAndBioResult?.bio) {
        throw new Error("Failed to generate character name or biography.");
      }
      if (!imageResult?.imageUrl) {
        throw new Error("Failed to generate character image.");
      }

      const newCharacter = {
        name: nameAndBioResult.name,
        bio: nameAndBioResult.bio,
        imageUrl: imageResult.imageUrl,
      };

      setCharacter(newCharacter);
      createCharacterMutation.mutate({
        ...newCharacter,
        associatedDataPacks: [selectedPack.id],
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: error.message || "There was a problem with the AI generation. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const renderPackSelection = () => (
    <Card className="bg-secondary/20 border-border/50">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Step 1: Choose a Style Pack</CardTitle>
        <CardDescription>Select one of your installed DataPacks to define the character's core style.</CardDescription>
      </CardHeader>
      <CardContent>
        {arePacksLoading ? (
           <div className="grid grid-cols-2 gap-4">
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-24 w-full" />
           </div>
        ) : installedPacks && installedPacks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {installedPacks.map((pack) => (
              <Card
                key={pack.id}
                className="cursor-pointer hover:border-primary transition-colors bg-background/50"
                onClick={() => setSelectedPack(pack)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{pack.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{pack.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
            <p className="text-muted-foreground p-4 text-center">No data packs installed. Go to the main page to find and install new DataPacks.</p>
        )}
      </CardContent>
    </Card>
  );

  const renderPromptBuilder = () => (
     <Card className="bg-secondary/20 border-border/50">
        <CardHeader>
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" onClick={() => { setSelectedPack(null); setPromptTemplate(null); }}>
                <ArrowLeft />
            </Button>
            <div>
                 <CardTitle className="font-headline text-3xl">Step 2: Customize Your Character</CardTitle>
                 <CardDescription>You're using the <span className="font-bold text-primary">{selectedPack?.name}</span> style pack.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isTemplateLoading && <p>Loading template...</p>}
            {!isTemplateLoading && promptTemplate && (
                 <PromptBuilder
                    key={selectedPack?.id}
                    schema={promptTemplate}
                    onSubmit={(result) => handleGeneration(form.getValues('preferences'), result)}
                    isLoading={isLoading || createCharacterMutation.isPending}
                />
            )}
             {!isTemplateLoading && !promptTemplate && (
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(v => handleGeneration(v.preferences))} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="preferences"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Character Details</FormLabel>
                                <FormControl>
                                <Textarea
                                    placeholder="e.g., 'A wise old wizard with a long white beard...'"
                                    className="min-h-[120px] resize-y bg-background/50 focus:bg-background"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                                <FormDescription>This pack has no custom template. Describe your character freely.</FormDescription>
                            </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading || createCharacterMutation.isPending}>
                                <Wand2 className="mr-2 h-4 w-4" /> Forge Character
                            </Button>
                        </div>
                    </form>
                 </Form>
             )}
        </CardContent>
     </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
      <div>
        {!selectedPack ? renderPackSelection() : renderPromptBuilder()}
      </div>
      
      <Card className="min-h-[400px] flex flex-col justify-center transition-all duration-300 bg-secondary/20 border-border/50 sticky top-24">
        {isLoading && (
          <div className="animate-in fade-in">
             <Skeleton className="w-full aspect-square rounded-t-lg" />
             <div className="p-6 space-y-4">
               <Skeleton className="h-8 w-1/2" />
               <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
               </div>
             </div>
          </div>
        )}
        {!isLoading && !character && (
            <div className="flex flex-col items-center justify-center text-center p-8">
                <Sparkles className="w-16 h-16 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">
                    Your generated character will appear here.
                </p>
            </div>
        )}
        {!isLoading && character && (
          <div className="animate-in fade-in">
            <CardHeader className="p-0">
              <Image
                src={character.imageUrl}
                alt={`AI generated image of ${character.name}`}
                width={512}
                height={512}
                className="w-full h-auto aspect-square object-cover rounded-t-lg"
                data-ai-hint="character portrait"
              />
            </CardHeader>
            <CardContent className="p-6">
              <h2 className="text-3xl font-bold font-headline text-primary-foreground bg-gradient-to-r from-primary to-blue-400 -ml-8 pl-8 pr-4 py-2 rounded-r-full shadow-lg">
                {character.name}
              </h2>
              <p className="mt-4 text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {character.bio}
              </p>
            </CardContent>
          </div>
        )}
      </Card>
    </div>
  );
}
