"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Sparkles, Wand2 } from "lucide-react";

import { generateCharacterNameAndBio } from "@/ai/flows/generate-character-name-and-bio";
import { generateCharacterImage } from "@/ai/flows/generate-character-image";
import { trpc } from "@/lib/trpc/client";

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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/AuthProvider";

const formSchema = z.object({
  preferences: z.string().min(20, {
    message: "Please describe your character in at least 20 characters.",
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
  const { toast } = useToast();
  const { user } = useAuth();
  const utils = trpc.useUtils();

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
    defaultValues: {
      preferences: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be signed in to create a character.",
      });
      return;
    }
    
    setIsLoading(true);
    setCharacter(null);

    try {
      const imagePrompt = `A fantasy portrait of a character described as: ${values.preferences}. High quality, digital painting, intricate details.`;
      
      const datapackId = "core_base_styles";

      const [nameAndBioResult, imageResult] = await Promise.all([
        generateCharacterNameAndBio({ 
          userId: user.uid,
          datapackId: datapackId,
          userPreferences: values.preferences 
        }),
        generateCharacterImage({
          userId: user.uid,
          datapackId: datapackId,
          prompt: imagePrompt
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

      // Save the character to the vault
      createCharacterMutation.mutate({
        ...newCharacter,
        associatedDataPacks: [datapackId],
      });

    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: error.message ||
          "There was a problem with the AI generation. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
      <Card className="bg-secondary/20 border-border/50">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Describe Your Character</CardTitle>
          <CardDescription>
            Provide a description, and our AI will bring your character to life.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Character Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'A wise old wizard with a long white beard, a mischievous twinkle in his eyes, holding a glowing staff.'"
                        className="min-h-[120px] resize-y bg-background/50 focus:bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || createCharacterMutation.isPending} className="w-full">
                {isLoading ? (
                  "Generating..."
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Forge Character
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card className="min-h-[400px] flex flex-col justify-center transition-all duration-300 bg-secondary/20 border-border/50">
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
