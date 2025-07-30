"use client";

import { useForm, Controller } from "react-hook-form";
import { ParsedPromptTemplate, Placeholder } from "@/lib/prompt-parser";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wand2 } from "lucide-react";
import React from "react";

interface PromptBuilderProps {
  schema: ParsedPromptTemplate;
  onSubmit: (result: { prompt: string; negativePrompt: string }) => void;
  isLoading?: boolean;
}

export function PromptBuilder({ schema, onSubmit, isLoading = false }: PromptBuilderProps) {
  const form = useForm();
  const watchedInputs = form.watch();

  const buildPrompt = React.useCallback(() => {
    let result = schema.template;
    
    // Create a set of unique placeholder keys to iterate over
    const uniquePlaceholders = schema.placeholders.reduce((acc, current) => {
        if (!acc.find(item => item.key === current.key)) {
            acc.push(current);
        }
        return acc;
    }, [] as Placeholder[]);

    for (const ph of uniquePlaceholders) {
      const value = watchedInputs[ph.key];
      if (value) {
         // Regex to replace all occurrences of a placeholder, e.g., {accessory}
         const re = new RegExp(`\\{${ph.key.replace('.', '\\.')}(\\[\\d+\\])?\\}`, "g");
         result = result.replace(re, value);
      }
    }
    return result;
  }, [schema.template, schema.placeholders, watchedInputs]);

  const finalPrompt = buildPrompt();

  function onFormSubmit() {
    onSubmit({
      prompt: finalPrompt,
      negativePrompt: schema.negativePrompt,
    });
  }
  
  // Get unique placeholders for rendering the form, avoiding duplicate fields for the same key
  const uniqueRenderPlaceholders = schema.placeholders.reduce((acc, current) => {
    if (!acc.some(item => item.key === current.key)) {
      acc.push(current);
    }
    return acc;
  }, [] as Placeholder[]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueRenderPlaceholders.map((ph) => (
            <FormField
              key={ph.key}
              control={form.control}
              name={ph.key}
              defaultValue=""
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{ph.label}</FormLabel>
                    <FormControl>
                    {ph.type === "select" ? (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder={`Select ${ph.label}...`} />
                            </SelectTrigger>
                            <SelectContent>
                            {ph.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                {option}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input placeholder={ph.label} {...field} />
                    )}
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        
        <Card className="bg-secondary/30">
            <CardHeader>
                <CardTitle>Generated Prompt</CardTitle>
                <CardDescription>This is the final prompt that will be sent to the AI.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm font-mono bg-background/50 p-4 rounded-md whitespace-pre-wrap">{finalPrompt || "Fill out the fields to see the generated prompt."}</p>
                {schema.negativePrompt && (
                    <>
                        <h4 className="font-semibold mt-4">Negative Prompt:</h4>
                        <p className="text-sm font-mono bg-background/50 p-4 rounded-md whitespace-pre-wrap">{schema.negativePrompt}</p>
                    </>
                )}
            </CardContent>
        </Card>

        <div className="flex justify-end">
             <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? (
                  "Generating..."
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Forge Character
                  </>
                )}
              </Button>
        </div>
      </form>
    </Form>
  );
}
