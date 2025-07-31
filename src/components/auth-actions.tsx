"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "./ui/button";
import { LogIn, Loader2 } from "lucide-react";
import { UserNav } from "./user-nav";

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
    
    return <UserNav />;
}
