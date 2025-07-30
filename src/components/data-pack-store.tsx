
"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Download, Trash2, Package } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

export function DataPackStore() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { user, loading: authLoading } = useAuth();

  const { data: packs, isLoading: isLoadingPacks, error: packsError } =
    trpc.datapack.getNewDataPacks.useQuery({ limit: 4 });
  
  const { data: userData, isLoading: isLoadingUser } = trpc.user.getUser.useQuery(undefined, {
      enabled: !!user
  });

  const installMutation = trpc.user.installDataPack.useMutation({
    onSuccess: () => {
      utils.user.getUser.invalidate();
      utils.datapack.listInstalled.invalidate();
      toast({
        title: "Pack Installed",
        description: "The DataPack has been added to your library.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Installation Failed",
        description: error.message,
      });
    },
  });

  const uninstallMutation = trpc.user.uninstallDataPack.useMutation({
    onSuccess: () => {
      utils.user.getUser.invalidate();
      utils.datapack.listInstalled.invalidate();
      toast({
        title: "Pack Uninstalled",
        description: "The DataPack has been removed from your library.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Uninstallation Failed",
        description: error.message,
      });
    },
  });

  const handleInstall = (packId: string) => {
    if (!user) {
        toast({ variant: "destructive", title: "You must be signed in."});
        return;
    }
    installMutation.mutate({ packId });
  };

  const handleUninstall = (packId: string) => {
     if (!user) {
        toast({ variant: "destructive", title: "You must be signed in."});
        return;
    }
    uninstallMutation.mutate({ packId });
  };

  const isLoading = installMutation.isPending || uninstallMutation.isPending;

  if (isLoadingPacks) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
           <Card key={i}>
             <CardHeader>
               <Skeleton className="h-6 w-1/2" />
               <Skeleton className="h-4 w-full mt-2" />
             </CardHeader>
             <CardContent>
                <Skeleton className="h-10 w-full" />
             </CardContent>
           </Card>
        ))}
      </div>
    );
  }

  if (packsError) {
    return <p className="text-destructive">Failed to load data packs.</p>;
  }
  
  if (!packs || packs.length === 0) {
    return (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No New DataPacks</h3>
            <p className="text-muted-foreground mt-2">
                Check back later for new content!
            </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {packs?.map((pack) => {
        const isInstalled = !!user && !!userData?.installedPacks.includes(pack.id);
        const isUninstalling = uninstallMutation.isPending && uninstallMutation.variables?.packId === pack.id;
        const isInstalling = installMutation.isPending && installMutation.variables?.packId === pack.id;


        return (
          <Card key={pack.id} className="flex flex-col">
            <CardHeader className="flex-grow">
              <CardTitle>{pack.name}</CardTitle>
              <CardDescription>{pack.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {isInstalled ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleUninstall(pack.id)}
                  disabled={isLoading || pack.id === 'core_base_styles'}
                >
                  {isUninstalling ? (
                    'Uninstalling...'
                  ) : (
                    <>
                      <CheckCircle className="mr-2" />
                      Installed
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleInstall(pack.id)}
                  disabled={isLoading || authLoading}
                >
                   {isInstalling ? (
                    'Installing...'
                  ) : (
                    <>
                     <Download className="mr-2" />
                     Install
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

