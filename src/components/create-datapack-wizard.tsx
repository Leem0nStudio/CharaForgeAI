
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
import { Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";


const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  premiumStatus: z.enum(['free', 'purchased', 'subscription']),
  promptTemplateContent: z.string().optional(),
  coverImage: z.string().optional(),
});

type CreateDataPackWizardProps = {
  onFinished: () => void;
};

export function CreateDataPackWizard({ onFinished }: CreateDataPackWizardProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("info");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            premiumStatus: "free",
            promptTemplateContent: `template: |\n  A high quality fantasy portrait of {name}, a {class}, with {accessory}.\n\nnegative_prompt: |\n  low quality, blurry, ugly\n\nplaceholders:\n  name:\n    type: text\n    label: Character Name\n  class:\n    type: select\n    label: Class\n    options:\n      - Warrior\n      - Mage\n      - Rogue\n  accessory:\n    type: text\n    label: Key Accessory`,
            coverImage: "",
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

    const goToNextStep = async (currentStep: 'info' | 'cover', nextStep: 'cover' | 'template' | 'review') => {
        const fieldsToValidate: (keyof z.infer<typeof formSchema>)[] = currentStep === 'info' 
            ? ['name', 'description', 'premiumStatus'] 
            : ['coverImage'];
        
        const result = await form.trigger(fieldsToValidate);
        if (result) {
            setActiveTab(nextStep);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setImagePreview(dataUrl);
                form.setValue("coverImage", dataUrl);
            };
            reader.readAsDataURL(file);
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
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="info">1. Info</TabsTrigger>
                        <TabsTrigger value="cover">2. Cover</TabsTrigger>
                        <TabsTrigger value="template">3. Template</TabsTrigger>
                        <TabsTrigger value="review">4. Review</TabsTrigger>
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
                            <Button type="button" onClick={() => goToNextStep('info', 'cover')}>Next Step</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="cover" className="py-4">
                        <Card>
                             <CardHeader>
                                <CardTitle>Cover Image</CardTitle>
                                <CardDescription>Upload an image for your DataPack. Recommended size: 512x512.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="coverImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary transition-colors">
                                                    {imagePreview ? (
                                                        <Image src={imagePreview} alt="Cover preview" width={256} height={256} className="mb-4 rounded-md object-cover" />
                                                    ) : (
                                                        <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                                                    )}
                                                    <p className="text-muted-foreground mb-2">Drag & drop or click to upload</p>
                                                    <Input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" id="file-upload" onChange={handleFileChange} />
                                                    <Button type="button" asChild><label htmlFor="file-upload">Choose File</label></Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        <div className="flex justify-between mt-4">
                            <Button type="button" variant="outline" onClick={() => setActiveTab("info")}>Previous</Button>
                            <Button type="button" onClick={() => goToNextStep('cover', 'template')}>Next Step</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="template" className="py-4">
                        <Card>
                             <CardHeader>
                                <CardTitle>Prompt Template</CardTitle>
                                <CardDescription>Define the YAML structure for the prompt generation UI. Leave blank if not needed.</CardDescription>
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
                            <Button type="button" variant="outline" onClick={() => setActiveTab("cover")}>Previous</Button>
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
                                {imagePreview && (
                                    <div>
                                        <h4 className="font-semibold">Cover Image:</h4>
                                        <Image src={imagePreview} alt="Cover preview" width={128} height={128} className="rounded-md object-cover mt-2 border" />
                                    </div>
                                )}
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
                                    <pre className="bg-muted p-4 rounded-md text-xs max-h-60 overflow-auto">{watchedValues.promptTemplateContent || "No template provided."}</pre>
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
