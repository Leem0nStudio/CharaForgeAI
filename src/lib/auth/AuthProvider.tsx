
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
      setLoading(true);
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
      // After sign-in, onAuthStateChanged will trigger and handle the user state.
      // We can invalidate queries here to ensure data is fresh.
      await queryClient.invalidateQueries();
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        console.error("Error signing in with Google: ", error);
      }
    } finally {
      // setLoading will be updated by onAuthStateChanged
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      // After sign-out, onAuthStateChanged will trigger, setting user to null.
      await queryClient.invalidateQueries();
    } catch (error) {
      console.error("Error signing out: ", error);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, signInWithGoogle, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
