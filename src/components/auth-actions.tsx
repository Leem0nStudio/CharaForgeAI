"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "./ui/button";
import { LogIn, Loader2, SquarePen } from "lucide-react";
import { UserNav } from "./user-nav";
import Link from "next/link";

export function AuthActions() {
    const { user, loading, signInWithGoogle } = useAuth();

    if (loading) {
        return <Loader2 className="h-6 w-6 animate-spin" />;
    }

    if (!user) {
        return (
            <Button onClick={signInWithGoogle}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
            </Button>
        );
    }
    
    return (
        <>
            <Button asChild>
                <Link href="/create">
                    <SquarePen className="mr-2 h-4 w-4" />
                    Creator
                </Link>
            </Button>
            <UserNav />
        </>
    );
}
