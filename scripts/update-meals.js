import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc } from 'firebase/firestore';

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

async function updateMeals() {
  const snap = await getDocs(collection(db, 'restaurants'));
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    
    // Logic for meals
    let is_breakfast = false;
    let is_lunch = false;
    let is_dinner = false;

    const type = (data.primary_type || data.restaurant_type || '').toLowerCase();
    const nameStr = (data.name || '').toLowerCase();
    
    if (type.includes('misal') || type.includes('khandoli') || type.includes('breakfast') || type.includes('bakery') || nameStr.includes('misal') || nameStr.includes('khandoli')) {
      is_breakfast = true;
      is_lunch = true; // Misals are open for lunch too usually
    }
    
    if (type.includes('thali') || type.includes('khanaval') || type.includes('non-veg') || type.includes('veg') || type.includes('restaurant')) {
      is_lunch = true;
      is_dinner = true;
    }

    // Default if none matched
    if (!is_breakfast && !is_lunch && !is_dinner) {
      is_lunch = true;
      is_dinner = true;
    }

    await updateDoc(docSnap.ref, {
      is_breakfast,
      is_lunch,
      is_dinner
    });
    console.log(`Updated ${data.name}: Breakfast=${is_breakfast}, Lunch=${is_lunch}, Dinner=${is_dinner}`);
  }
  console.log("Migration complete!");
  process.exit(0);
}

updateMeals().catch(console.error);
