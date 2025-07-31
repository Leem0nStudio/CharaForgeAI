
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


const profileFormSchema = z.object({
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
});

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    values: {
        displayName: user?.displayName ?? "",
    }
  });

  const { mutate: updateUser, isPending: isUpdating } = trpc.user.updateUser.useMutation({
    onSuccess: () => {
        toast({
            title: "Profile updated",
            description: "Your display name has been successfully updated.",
        });
        // We need to refetch user data to update the UI everywhere
        utils.user.getUser.invalidate();
    },
    onError: (error) => {
        toast({
            variant: "destructive",
            title: "Update failed",
            description: error.message,
        });
    }
  });

  function onSubmit(data: z.infer<typeof profileFormSchema>) {
    updateUser(data);
  }

  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!user) {
         return (
             <div className="text-center py-16">
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-muted-foreground mt-2">
                    You must be signed in to view your profile.
                </p>
            </div>
         )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold font-headline">Your Profile</h2>
                <p className="text-muted-foreground">Manage your account settings.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary">
                            <AvatarImage src={user.photoURL ?? ""} />
                            <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{user.displayName}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <FormField
                                control={form.control}
                                name="displayName"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your display name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )

  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="p-4 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
}
