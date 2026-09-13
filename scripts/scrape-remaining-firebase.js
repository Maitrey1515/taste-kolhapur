import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
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

puppeteer.use(StealthPlugin());
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeImage(page, restaurantName) {
  let imageUrl = null;
  const imageSearchQuery = encodeURIComponent(`${restaurantName} Kolhapur restaurant food exterior`);
  await page.goto(`https://www.bing.com/images/search?q=${imageSearchQuery}`, { waitUntil: 'networkidle2' });
  
  try {
    const imgSrc = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img.mimg'));
        const validImg = imgs.find(img => img.src && img.src.startsWith('http'));
        return validImg ? validImg.src : null;
    });
    if (imgSrc) imageUrl = imgSrc;
  } catch(e) {
      console.log(`  -> Error parsing image for ${restaurantName}.`);
  }
  return imageUrl;
}

async function run() {
  console.log("Fetching restaurants from Firebase...");
  const snap = await getDocs(collection(db, 'restaurants'));
  
  const restaurantsToScrape = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    // Only scrape if it doesn't have a cover image, OR if it's an unsplash fallback
    if (!data.cover_image || data.cover_image.includes('unsplash.com')) {
      restaurantsToScrape.push({ ref: docSnap.ref, name: data.name });
    }
  }

  console.log(`Found ${restaurantsToScrape.length} restaurants needing images.`);
  if (restaurantsToScrape.length === 0) {
      console.log("Nothing to do!");
      process.exit(0);
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  let count = 0;
  for (const restaurant of restaurantsToScrape) {
    console.log(`Scraping [${++count}/${restaurantsToScrape.length}]: ${restaurant.name}`);
    
    const imageUrl = await scrapeImage(page, restaurant.name);
    
    if (imageUrl) {
        console.log(`  -> Found Image! Updating Firebase...`);
        await updateDoc(restaurant.ref, { cover_image: imageUrl });
    } else {
        console.log(`  -> No Image Found.`);
    }
    
    await delay(1500);
  }

  await browser.close();
  console.log("\nFinished updating all remaining restaurants!");
  process.exit(0);
}

run().catch(console.error);
