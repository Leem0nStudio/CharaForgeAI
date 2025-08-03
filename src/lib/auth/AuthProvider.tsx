
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
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  loading: true,
  error: null,
});

// Default user data for new users
const createDefaultUserData = (user: User) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  purchasedPacks: [],
  installedPacks: ['core_base_styles'], // Default core pack
  subscriptionTier: 'free',
  totalLikes: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  isActive: true,
  preferences: {
    theme: 'system',
    notifications: true,
    privacy: 'public'
  }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create or update user document in Firestore
  const ensureUserDocument = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user document
        const userData = createDefaultUserData(user);
        await setDoc(userDocRef, userData);
        
        toast({
          title: "Welcome!",
          description: "Your account has been set up successfully.",
        });
      } else {
        // Update existing user document with latest auth info
        const existingData = userDoc.data();
        const updateData: any = {
          updatedAt: serverTimestamp(),
        };
        
        // Update auth fields if they've changed
        if (existingData.email !== user.email) updateData.email = user.email;
        if (existingData.displayName !== user.displayName) updateData.displayName = user.displayName;
        if (existingData.photoURL !== user.photoURL) updateData.photoURL = user.photoURL;
        
        // Ensure core pack is installed
        if (!existingData.installedPacks?.includes('core_base_styles')) {
          updateData.installedPacks = [...(existingData.installedPacks || []), 'core_base_styles'];
        }
        
        // Only update if there are changes
        if (Object.keys(updateData).length > 1) {
          await setDoc(userDocRef, updateData, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error ensuring user document:', error);
      setError('Failed to set up user account');
      toast({
        title: "Account Setup Error",
        description: "There was an issue setting up your account. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userState) => {
      setLoading(true);
      setError(null);
      
      try {
        if (userState) {
          // Ensure user document exists in Firestore
          await ensureUserDocument(userState);
          
          // Get admin claims
          const idTokenResult = await userState.getIdTokenResult();
          setUser(userState);
          setIsAdmin(!!idTokenResult.claims.admin);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setError('Authentication error occurred');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Request additional scopes for better user info
    provider.addScope('profile');
    provider.addScope('email');
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, provider);
      
      // onAuthStateChanged will handle the user state update and document creation
      // Invalidate queries to ensure fresh data after login
      await queryClient.invalidateQueries();
      
      toast({
        title: "Signed in successfully",
        description: `Welcome ${result.user.displayName || 'back'}!`,
      });
      
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      
      if (error.code === "auth/popup-closed-by-user") {
        // User closed popup, don't show error
        setError(null);
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups and try again.");
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again.",
          variant: "destructive",
        });
      } else {
        setError("Failed to sign in. Please try again.");
        toast({
          title: "Sign In Error",
          description: "There was an issue signing you in. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await auth.signOut();
      // onAuthStateChanged will handle setting user to null
      await queryClient.invalidateQueries();
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out");
      toast({
        title: "Sign Out Error", 
        description: "There was an issue signing you out.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, signInWithGoogle, signOut, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
