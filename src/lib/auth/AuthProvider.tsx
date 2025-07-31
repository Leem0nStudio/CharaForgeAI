
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userState) => {
      if (userState) {
        const idTokenResult = await userState.getIdTokenResult();
        setUser(userState);
        setIsAdmin(!!idTokenResult.claims.admin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the user state update.
      // We invalidate queries here to ensure data is fresh after login.
      await queryClient.invalidateQueries();
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        console.error("Error signing in with Google: ", error);
      }
      // In case of error, ensure loading state is reset.
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      // onAuthStateChanged will handle setting user to null.
      await queryClient.invalidateQueries();
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
