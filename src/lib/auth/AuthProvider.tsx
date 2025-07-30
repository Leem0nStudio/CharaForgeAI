
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  getIdToken,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { queryClient } from "@/lib/trpc/client";

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userState) => {
      setLoading(true);
      if (userState) {
        setUser(userState);
        const idTokenResult = await userState.getIdTokenResult();
        setIsAdmin(!!idTokenResult.claims.admin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      
      // Invalidate the entire tRPC cache on auth state change.
      // This is the key to ensuring all components get fresh data after login/logout.
      await queryClient.invalidateQueries();
      router.refresh();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

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
