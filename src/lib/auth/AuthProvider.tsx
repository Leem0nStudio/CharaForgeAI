
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  getIdToken,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/client"; // db is not used, can be removed
import { useRouter } from "next/navigation";
import { trpcClient } from "@/lib/trpc/client";
import { FieldValue } from "firebase/firestore"; // Not used here, can be removed

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

async function manageUserInFirestore(user: User | null) {
  if (user) {
    const userRef = (await import('firebase/firestore')).doc(db, "users", user.uid);
    const userDoc = await (await import('firebase/firestore')).getDoc(userRef);

    if (!userDoc.exists()) {
      console.log("[AuthProvider] User not found in Firestore, creating...");
      await (await import('firebase/firestore')).setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        purchasedPacks: [],
        installedPacks: ["core_base_styles"],
        subscriptionTier: "free",
        totalLikes: 0,
        createdAt: (await import('firebase/firestore')).serverTimestamp(),
        updatedAt: (await import('firebase/firestore')).serverTimestamp(),
      });
      console.log("[AuthProvider] User created in Firestore");
    }
  }
}


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
        await manageUserInFirestore(userState);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      
      // Invalidate the entire tRPC cache on auth state change.
      // This is the key to ensuring all components get fresh data after login.
      await trpcClient.queryClient.invalidateQueries();
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
