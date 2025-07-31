
"use client";

import { useState } from "react";
import Image from "next/image";
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
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Loader2, Package, Edit } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CreateDataPackWizard } from "@/components/create-datapack-wizard";
import { EditDataPackForm } from "@/components/edit-datapack-form";
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from "@/lib/trpc/server";

type DataPack = inferRouterOutputs<AppRouter["datapack"]["listAll"]>[number];


export default function AdminDataPacksPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedPack, setSelectedPack] = useState<DataPack | null>(null);
    
    const { data: packs, isLoading: packsLoading, error } = trpc.datapack.listAll.useQuery();
    
    const utils = trpc.useUtils();

    const onWizardFinished = () => {
        setIsCreateOpen(false);
        utils.datapack.listAll.invalidate();
    }
    
    const onEditFinished = () => {
        setIsEditOpen(false);
        setSelectedPack(null);
        utils.datapack.listAll.invalidate();
    }

    const handleEditClick = (pack: DataPack) => {
        setSelectedPack(pack);
        setIsEditOpen(true);
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
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {packs?.map(pack => (
                                        <TableRow key={pack.id}>
                                            <TableCell>
                                                {pack.coverImageUrl && (
                                                    <Image src={pack.coverImageUrl} alt={pack.name} width={128} height={72} className="rounded-sm object-cover aspect-[16/9]" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{pack.name}</TableCell>
                                            <TableCell className="text-muted-foreground max-w-xs truncate">{pack.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={pack.premiumStatus === 'free' ? 'secondary' : 'default'}>
                                                    {pack.premiumStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {pack.createdAt ? new Date(pack.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleEditClick(pack)}>
                                                    <Edit className="mr-2 h-3 w-3" /> Edit
                                                </Button>
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
                                    {pack.coverImageUrl && (
                                        <Image src={pack.coverImageUrl} alt={pack.name} width={512} height={288} className="rounded-t-lg object-cover aspect-[16/9]" />
                                    )}
                                    <CardHeader>
                                         <div className="flex justify-between items-start">
                                            <CardTitle>{pack.name}</CardTitle>
                                            <Badge variant={pack.premiumStatus === 'free' ? 'secondary' : 'default'}>
                                                {pack.premiumStatus}
                                            </Badge>
                                        </div>
                                        <CardDescription>{pack.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">
                                            Created: {pack.createdAt ? new Date(pack.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </CardContent>
                                     <CardFooter>
                                        <Button variant="outline" className="w-full" onClick={() => handleEditClick(pack)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    </CardFooter>
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

            {selectedPack && (
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Edit: {selectedPack.name}</DialogTitle>
                        </DialogHeader>
                        <EditDataPackForm
                            datapack={selectedPack}
                            onFinished={onEditFinished}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
