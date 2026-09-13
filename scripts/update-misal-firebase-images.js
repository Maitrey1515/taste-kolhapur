import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

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

async function updateFirebaseImages() {
  console.log("Reading master data...");
  const masterDataPath = resolve(__dirname, '../src/data/tastekolhapur_master_data.json');
  const masterData = JSON.parse(fs.readFileSync(masterDataPath, 'utf-8'));
  
  // Create mapping of name -> cover_image
  const imageMap = {};
  for (const restaurant of masterData) {
    if (restaurant.cover_image) {
      imageMap[restaurant.name] = restaurant.cover_image;
    }
  }

  console.log("Fetching documents from Firestore...");
  const snap = await getDocs(collection(db, 'restaurants'));
  
  let updatedCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (imageMap[data.name]) {
      console.log(`Updating cover_image for: ${data.name}`);
      await updateDoc(docSnap.ref, {
        cover_image: imageMap[data.name]
      });
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} restaurants in Firebase with new images!`);
  process.exit(0);
}

updateFirebaseImages().catch(console.error);
