import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export const isFirebaseConfigured = 
  Boolean(firebaseConfig.apiKey) && firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  Boolean(firebaseConfig.projectId) && firebaseConfig.projectId !== 'YOUR_FIREBASE_PROJECT_ID';

if (!isFirebaseConfigured) {
  console.error(
    'Firebase configuration is missing or incomplete. Check Vercel environment variables.'
  );
}

// Create client — if not configured, create with dummy values to prevent crashes
export const app = initializeApp(isFirebaseConfigured ? firebaseConfig : {
  apiKey: "mock-key",
  authDomain: "mock-domain",
  projectId: "mock-id",
  storageBucket: "mock-bucket",
  messagingSenderId: "mock-sender",
  appId: "mock-app"
});

export const auth = getAuth(app);
export const db = getFirestore(app);
