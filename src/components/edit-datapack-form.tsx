
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState, useEffect } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from "@/lib/trpc/server";

type DataPack = inferRouterOutputs<AppRouter["datapack"]["listAll"]>[number];

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  premiumStatus: z.enum(['free', 'purchased', 'subscription']),
  promptTemplateContent: z.string().optional(),
  coverImage: z.string().optional(), // Can be a new data URI or existing URL
});

type EditDataPackFormProps = {
  datapack: DataPack;
  onFinished: () => void;
};

export function EditDataPackForm({ datapack, onFinished }: EditDataPackFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(datapack.coverImageUrl ?? null);

    const { data: templateData, isLoading: isLoadingTemplate } = trpc.datapack.getTemplateContent.useQuery(
        { packId: datapack.id },
        {
            refetchOnWindowFocus: false, // Prevents re-fetching which would overwrite user edits
            onSuccess: (data) => {
                form.setValue("promptTemplateContent", data.content);
            }
        }
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: datapack.name,
            description: datapack.description,
            premiumStatus: datapack.premiumStatus,
            promptTemplateContent: "", // Will be set by the query
            coverImage: datapack.coverImageUrl, // Start with existing URL
        },
    });
    
    const updatePackMutation = trpc.datapack.update.useMutation({
        onSuccess: () => {
            toast({
                title: "DataPack Updated!",
                description: "The DataPack has been successfully updated."
            });
            onFinished();
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message
            });
        },
        onSettled: () => {
            setIsSubmitting(false);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setImagePreview(dataUrl);
                form.setValue("coverImage", dataUrl); // Set the new data URI
            };
            reader.readAsDataURL(file);
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        // Only pass the coverImage if it's a new file (data URI)
        const submissionValues = {
            ...values,
            id: datapack.id,
            coverImage: values.coverImage?.startsWith('data:image') ? values.coverImage : undefined,
        };
        updatePackMutation.mutate(submissionValues);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl><Input placeholder="e.g., 'Cyberpunk Mercenaries'" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea placeholder="A brief description of what this pack contains." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="premiumStatus"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Premium Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="purchased">Requires Purchase</SelectItem>
                                        <SelectItem value="subscription">Requires Subscription</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="coverImage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cover Image</FormLabel>
                            <FormControl>
                                <div className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary transition-colors">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt="Cover preview" width={320} height={180} className="mb-4 rounded-md object-cover aspect-[16/9]" />
                                    ) : (
                                        <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                                    )}
                                    <p className="text-muted-foreground mb-2">Drag & drop or click to upload new image</p>
                                    <Input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" id="file-upload-edit" onChange={handleFileChange} />
                                    <Button type="button" asChild><label htmlFor="file-upload-edit">Choose File</label></Button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="promptTemplateContent"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prompt Template (YAML)</FormLabel>
                            <FormControl>
                                <Textarea 
                                    className="min-h-[300px] font-mono text-xs"
                                    placeholder="Paste your prompt_template.yaml content here..."
                                    {...field}
                                    disabled={isLoadingTemplate}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting || isLoadingTemplate}>
                        {(isSubmitting || isLoadingTemplate) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
