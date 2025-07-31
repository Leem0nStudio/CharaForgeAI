"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ShieldCheck, Search, UserCog, Library, SquarePen, User } from "lucide-react";


export function UserNav() {
    const { user, isAdmin, signOut } = useAuth();

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? ""} />
                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                    </p>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuItem asChild>
                <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
                <Link href="/create">
                    <SquarePen className="mr-2 h-4 w-4" />
                    <span>Creator</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/vault">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Character Vault</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/collections">
                <Library className="mr-2 h-4 w-4" />
                <span>Collections</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/explore">
                <Search className="mr-2 h-4 w-4" />
                <span>Explore</span>
                </Link>
            </DropdownMenuItem>
            {isAdmin && (
                <>
                <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                    <Link href="/admin">
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                    </Link>
                </DropdownMenuItem>
                </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
