
"use client";

import { useForm, Controller } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";


const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  premiumStatus: z.enum(['free', 'purchased', 'subscription']),
  promptTemplateContent: z.string().min(20, "Template content is required and must be a valid YAML structure.")
});

type CreateDataPackWizardProps = {
  onFinished: () => void;
};

export function CreateDataPackWizard({ onFinished }: CreateDataPackWizardProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("info");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            premiumStatus: "free",
            promptTemplateContent: `template: |\n  \n\nnegative_prompt: |\n  \n\nplaceholders:\n  `,
        },
    });
    
    const createPackMutation = trpc.datapack.create.useMutation({
        onSuccess: () => {
            toast({
                title: "DataPack Created!",
                description: "The new DataPack has been successfully created."
            });
            onFinished();
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Creation Failed",
                description: error.message
            });
        },
        onSettled: () => {
            setIsSubmitting(false);
        }
    });

    const watchedValues = form.watch();

    const goToNextStep = async () => {
        const fieldsToValidate = ['name', 'description', 'premiumStatus'] as const;
        const result = await form.trigger(fieldsToValidate);
        if (result) {
            setActiveTab("template");
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        createPackMutation.mutate(values);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="info">1. Basic Info</TabsTrigger>
                        <TabsTrigger value="template">2. Prompt Template</TabsTrigger>
                        <TabsTrigger value="review">3. Review & Save</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="py-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>DataPack Details</CardTitle>
                                <CardDescription>Provide the basic information for your new DataPack.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                            </CardContent>
                        </Card>
                         <div className="flex justify-end mt-4">
                            <Button type="button" onClick={goToNextStep}>Next Step</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="template" className="py-4">
                        <Card>
                             <CardHeader>
                                <CardTitle>Prompt Template</CardTitle>
                                <CardDescription>Define the YAML structure for the prompt generation UI.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <FormField
                                    control={form.control}
                                    name="promptTemplateContent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>YAML Content</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    className="min-h-[400px] font-mono text-xs"
                                                    placeholder="Paste your prompt_template.yaml content here..."
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        <div className="flex justify-between mt-4">
                            <Button type="button" variant="outline" onClick={() => setActiveTab("info")}>Previous</Button>
                             <Button type="button" onClick={() => setActiveTab("review")}>Review</Button>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="review" className="py-4">
                         <Card>
                             <CardHeader>
                                <CardTitle>Review Your DataPack</CardTitle>
                                <CardDescription>Please review the details below before creating the DataPack.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-semibold">Name:</h4>
                                    <p className="text-muted-foreground">{watchedValues.name || "Not set"}</p>
                                </div>
                                 <div>
                                    <h4 className="font-semibold">Description:</h4>
                                    <p className="text-muted-foreground">{watchedValues.description || "Not set"}</p>
                                </div>
                                 <div>
                                    <h4 className="font-semibold">Status:</h4>
                                    <p className="text-muted-foreground">{watchedValues.premiumStatus}</p>
                                </div>
                                 <div>
                                    <h4 className="font-semibold">Template Content:</h4>
                                    <pre className="bg-muted p-4 rounded-md text-xs max-h-60 overflow-auto">{watchedValues.promptTemplateContent}</pre>
                                </div>
                            </CardContent>
                        </Card>
                         <div className="flex justify-between mt-4">
                            <Button type="button" variant="outline" onClick={() => setActiveTab("template")}>Previous</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Creating..." : "Create DataPack"}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </form>
        </Form>
    );
}
