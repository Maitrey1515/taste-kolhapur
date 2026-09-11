import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function enableAR() {
  const q = query(collection(db, 'restaurants'), where('slug', '==', 'bawada-misal'));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("Restaurant not found. Querying all to set the first one...");
    const all = await getDocs(collection(db, 'restaurants'));
    if (all.empty) return;
    const docRef = all.docs[0].ref;
    await updateDoc(docRef, {
      ar_enabled: true,
      ar_model_url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
      ar_model_scale: '1 1 1'
    });
    console.log("Successfully enabled AR for " + all.docs[0].data().name);
    process.exit(0);
  }
  const docRef = snap.docs[0].ref;
  await updateDoc(docRef, {
    ar_enabled: true,
    ar_model_url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    ar_model_scale: '1 1 1'
  });
  console.log("Successfully enabled AR for Bawada Misal!");
  process.exit(0);
}

enableAR().catch(console.error);
