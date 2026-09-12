import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

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

// Read Excel
const workbook = xlsx.readFile('C:/Users/Maitrey/Downloads/TasteKolhapur_All_Hotels_Seed.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(worksheet);

function slugify(text) {
  return (text || '').toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function importData() {
  console.log(`Found ${rows.length} rows. Starting import...`);
  
  for (const row of rows) {
    const name = row['Restaurant Name'] || '';
    if (!name) continue;

    const typeStr = (row['Type'] || '').toLowerCase();
    const catStr = (row['Main Category'] || '').toLowerCase();
    
    // Meal logic
    let is_breakfast = false;
    let is_lunch = false;
    let is_dinner = false;
    
    const combinedStr = name.toLowerCase() + " " + typeStr + " " + catStr;
    
    if (combinedStr.includes('misal') || combinedStr.includes('khandoli') || combinedStr.includes('breakfast') || combinedStr.includes('bakery')) {
      is_breakfast = true;
      is_lunch = true;
    }
    
    if (combinedStr.includes('thali') || combinedStr.includes('khanaval') || combinedStr.includes('non-veg') || combinedStr.includes('veg') || combinedStr.includes('hotel') || combinedStr.includes('restaurant')) {
      is_lunch = true;
      is_dinner = true;
    }

    if (!is_breakfast && !is_lunch && !is_dinner) {
      is_lunch = true;
      is_dinner = true;
    }

    const slug = slugify(name);
    
    const restaurantData = {
      name: name,
      slug: slug,
      area: row['Area'] || 'Kolhapur',
      city: 'Kolhapur',
      address: row['Area'] || '',
      price_level: 2,
      avg_cost: 300,
      opening_hours: { default: "10:00-22:00" },
      features: {
        parking: false,
        ac: false,
        veg: combinedStr.includes('veg') && !combinedStr.includes('non-veg'),
        delivery: true,
        takeaway: true,
        family_friendly: true,
        wheelchair: false
      },
      claimed: false,
      review_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      restaurant_type: row['Type'] || 'Restaurant',
      primary_type: row['Main Category'] || 'Restaurant',
      is_breakfast,
      is_lunch,
      is_dinner,
      source: row['Source'] || 'Excel Seed',
      specialties: (row['Specialties / Dish Filters'] || '').split(',').map(s => s.trim())
    };

    // Use a specific doc reference (or slug) to prevent duplicates if run multiple times
    const docRef = doc(db, 'restaurants', slug);
    await setDoc(docRef, restaurantData, { merge: true });
    console.log(`Imported: ${name}`);
  }

  console.log('Import completed successfully!');
  process.exit(0);
}

importData().catch(console.error);
