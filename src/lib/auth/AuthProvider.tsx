"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  loading: true,
});

async function manageSessionCookie(idToken: string | null) {
  if (idToken) {
    // Create the session
    await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });
  } else {
    // Sign out
    await fetch("/api/auth/session", {
      method: "DELETE",
    });
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleAuthChange = useCallback(async (userState: User | null) => {
    setLoading(true);
    setUser(userState);
    if (userState) {
      const idTokenResult = await userState.getIdTokenResult();
      setIsAdmin(!!idTokenResult.claims.admin);
      await manageSessionCookie(idTokenResult.token);
    } else {
      setIsAdmin(false);
      await manageSessionCookie(null);
    }
    // Refresh the router to ensure server components re-render with the new auth state
    router.refresh(); 
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthChange);
    return () => unsubscribe();
  }, [handleAuthChange]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        return;
      }
      console.error("Error signing in with Google: ", error);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, signInWithGoogle, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
