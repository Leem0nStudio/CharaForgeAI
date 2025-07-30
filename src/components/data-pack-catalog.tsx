
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
import { CheckCircle, Download, Trash2 } from "lucide-react";

export function DataPackCatalog() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: packs, isLoading: isLoadingPacks, error: packsError } =
    trpc.datapack.listAll.useQuery();
  
  const { data: user, isLoading: isLoadingUser } = trpc.user.getUser.useQuery();

  const installMutation = trpc.user.installDataPack.useMutation({
    onSuccess: () => {
      utils.user.getUser.invalidate();
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
    installMutation.mutate({ packId });
  };

  const handleUninstall = (packId: string) => {
    uninstallMutation.mutate({ packId });
  };

  const isLoading = installMutation.isPending || uninstallMutation.isPending;

  if (isLoadingPacks || isLoadingUser) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packs?.map((pack) => {
        const isInstalled = user?.installedPacks.includes(pack.id);
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
                  <Trash2 className="mr-2" />
                  Uninstall
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleInstall(pack.id)}
                  disabled={isLoading}
                >
                  <Download className="mr-2" />
                  Install
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
