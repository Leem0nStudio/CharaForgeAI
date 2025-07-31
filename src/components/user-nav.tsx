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
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ShieldCheck, Search, UserCog, Library, SquarePen } from "lucide-react";


export function UserNav() {
    const { user, isAdmin, signOut } = useAuth();

    if (!user) return null;

    return (
        <>
            <Button asChild>
                <Link href="/create">
                    <SquarePen className="mr-2 h-4 w-4" />
                    Creator
                </Link>
            </Button>
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
                <DropdownMenuItem disabled>
                    <p className="font-medium">{user.displayName}</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
        </>
    );
}
