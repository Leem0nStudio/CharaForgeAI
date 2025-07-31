
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Loader2, Package } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CreateDataPackWizard } from "@/components/create-datapack-wizard";
import Image from "next/image";

export default function AdminDataPacksPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    const { data: packs, isLoading: packsLoading, error } = trpc.datapack.listAll.useQuery();
    
    const utils = trpc.useUtils();

    const onWizardFinished = () => {
        setIsCreateOpen(false);
        utils.datapack.listAll.invalidate();
    }

    const renderContent = () => {
        if (packsLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            );
        }

        if (error) {
            return <p className="text-destructive">Error loading DataPacks: {error.message}</p>
        }
        
        return (
            <>
                <div className="flex justify-end mb-4">
                     <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                             <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create New DataPack
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>DataPack Creation Wizard</DialogTitle>
                            </DialogHeader>
                            <CreateDataPackWizard onFinished={onWizardFinished} />
                        </DialogContent>
                    </Dialog>
                </div>
                {packs && packs.length > 0 ? (
                    <>
                        {/* Desktop Table View */}
                        <div className="border rounded-lg hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cover</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {packs?.map(pack => (
                                        <TableRow key={pack.id}>
                                            <TableCell>
                                                {pack.coverImageUrl && (
                                                    <Image src={pack.coverImageUrl} alt={pack.name} width={40} height={40} className="rounded-sm object-cover" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{pack.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{pack.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={pack.premiumStatus === 'free' ? 'secondary' : 'default'}>
                                                    {pack.premiumStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {pack.createdAt ? new Date(pack.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="grid gap-4 md:hidden">
                            {packs.map(pack => (
                                <Card key={pack.id}>
                                    <CardHeader>
                                        <div className="flex items-start gap-4">
                                             {pack.coverImageUrl && (
                                                <Image src={pack.coverImageUrl} alt={pack.name} width={64} height={64} className="rounded-md object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle>{pack.name}</CardTitle>
                                                    <Badge variant={pack.premiumStatus === 'free' ? 'secondary' : 'default'}>
                                                        {pack.premiumStatus}
                                                    </Badge>
                                                </div>
                                                <CardDescription>{pack.description}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">
                                            Created: {pack.createdAt ? new Date(pack.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold">No DataPacks Found</h3>
                        <p className="text-muted-foreground mt-2">
                            Click "Create New DataPack" to get started.
                        </p>
                    </div>
                )}
            </>
        )
    }

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-3xl font-bold font-headline">Manage DataPacks</h2>
                <p className="text-muted-foreground">Create, view, and manage character DataPacks.</p>
            </div>
            {renderContent()}
        </div>
    );
}
