import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate that the config has been populated
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Firebase client config is not set. Make sure you have a .env.local file with the required NEXT_PUBLIC_FIREBASE_* variables."
  );
}

// Development environment check
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_APP_ENV === 'development';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  // Initialize Firebase only on client side
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Connect to emulators in development
  if (isDevelopment) {
    // Auth Emulator
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST && !auth.config.emulator) {
      const [host, port] = process.env.FIREBASE_AUTH_EMULATOR_HOST.split(':');
      connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
      console.log('🔥 Connected to Firebase Auth Emulator');
    }

    // Firestore Emulator
    if (process.env.FIRESTORE_EMULATOR_HOST && !db._delegate._databaseId.projectId.includes('demo-')) {
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(db, host, parseInt(port));
      console.log('🔥 Connected to Firestore Emulator');
    }

    // Storage Emulator
    if (process.env.FIREBASE_STORAGE_EMULATOR_HOST && !storage._host.includes('localhost')) {
      const [host, port] = process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':');
      connectStorageEmulator(storage, host, parseInt(port));
      console.log('🔥 Connected to Firebase Storage Emulator');
    }
  }

  // Development logging
  if (isDevelopment) {
    console.log('📱 Firebase Client initialized:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      emulators: {
        auth: !!process.env.FIREBASE_AUTH_EMULATOR_HOST,
        firestore: !!process.env.FIRESTORE_EMULATOR_HOST,
        storage: !!process.env.FIREBASE_STORAGE_EMULATOR_HOST,
      }
    });
  }
}

// Helper function to check if we're using emulators
export const isUsingEmulators = () => {
  return isDevelopment && (
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    !!process.env.FIRESTORE_EMULATOR_HOST ||
    !!process.env.FIREBASE_STORAGE_EMULATOR_HOST
  );
};

// Helper function to get project info
export const getFirebaseConfig = () => ({
  ...firebaseConfig,
  isDevelopment,
  isUsingEmulators: isUsingEmulators(),
});

// These exports can be undefined on the server-side, so they should be used in client components.
// @ts-ignore
export { app, auth, db, storage };