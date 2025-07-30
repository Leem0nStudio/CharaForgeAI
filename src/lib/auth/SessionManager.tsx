"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { usePathname, useRouter } from "next/navigation";

// This component manages the user's session.
// It listens for changes in the user's authentication state and updates the session cookie accordingly.
export function SessionManager() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (newUser) => {
      const currentUser = user;
      const newUserState = newUser?.uid || null;
      const oldUserState = currentUser?.uid || null;

      if (newUserState !== oldUserState) {
        const idToken = await newUser?.getIdToken();
        const method = idToken ? "POST" : "DELETE";

        // Call the API to set/remove the session cookie
        await fetch("/api/auth/session", {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(idToken && { Authorization: `Bearer ${idToken}` }),
          },
        });
        
        // This is a client-side navigation that will re-render the layout and page
        // with the new authentication state.
        router.refresh();
      }
      setUser(newUser);
    });

    return () => unsubscribe();
  }, [pathname, router, user]);

  return null;
}
