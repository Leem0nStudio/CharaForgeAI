"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

// This component listens for ID token changes (which happen on sign-in, sign-out, and token refresh)
// and triggers a server-side re-render by calling router.refresh().
// This ensures that server components and TRPC routes are always evaluated
// with the latest authentication state reflected in the session cookie.
export function SessionManager() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      // The actual cookie management is now handled in AuthProvider.
      // Here, we just need to ensure the server is aware of any auth state changes.
      // router.refresh() forces a refresh of the Server Component tree and re-runs
      // the TRPC context creation on the server.
      console.log("Auth state changed, refreshing router...");
      router.refresh();
    });

    return () => unsubscribe();
  }, [router]);

  return null;
}