import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

async function scrapeGoogle() {
  console.log("Fetching restaurants from Firebase...");
  const snap = await getDocs(collection(db, 'restaurants'));
  const restaurants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${restaurants.length} restaurants to scrape.`);

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US']
  });
  const page = await browser.newPage();
  
  // Set user agent to avoid basic blocks
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  for (const r of restaurants) {
    try {
      console.log(`\nScraping: ${r.name}`);
      const query = `${r.name} Kolhapur restaurant`;
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
      
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Artificial delay to mimic human behavior
      await new Promise(res => setTimeout(res, 2000 + Math.random() * 2000));
      
      if (r.name.includes("Bawada")) {
        await page.screenshot({ path: 'puppeteer-debug.png' });
      }

      // Evaluate DOM
      const data = await page.evaluate(() => {
        let rating = null;
        let reviews = 0;
        let cover_image = null;

        // Find rating
        const ratingEl = document.querySelector('span.Aq14fc, span.fzOZmb');
        if (ratingEl) rating = parseFloat(ratingEl.innerText);

        // Find reviews
        const reviewEl = document.querySelector('span.hqzQac span a, a[data-async-trigger="reviewDialog"] span');
        if (reviewEl) {
          const revText = reviewEl.innerText.replace(/[^0-9]/g, '');
          if (revText) reviews = parseInt(revText, 10);
        }

        // Find cover image in knowledge panel
        // Usually it's in a div with data-attrid="image" or similar
        const imgEls = document.querySelectorAll('g-img img');
        for (const img of imgEls) {
          const src = img.src;
          if (src && src.startsWith('http') && !src.includes('map')) {
            cover_image = src;
            break;
          }
        }
        
        // Backup image selector
        if (!cover_image) {
           const backupImg = document.querySelector('.RqBzHd img, .lu-i img');
           if (backupImg) cover_image = backupImg.src;
        }

        return { rating, reviews, cover_image };
      });

      console.log(`  -> Rating: ${data.rating}, Reviews: ${data.reviews}, Image: ${data.cover_image ? 'Found' : 'Not Found'}`);

      // Update Firebase
      const updatePayload = { updated_at: new Date().toISOString() };
      if (data.rating) updatePayload.google_rating = data.rating;
      if (data.reviews) updatePayload.google_reviews = data.reviews;
      if (data.cover_image && !r.cover_image) updatePayload.cover_image = data.cover_image;

      await updateDoc(doc(db, 'restaurants', r.id), updatePayload);
      console.log(`  -> Saved to Firebase.`);
      
    } catch (err) {
      console.error(`  -> Failed to scrape ${r.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log("Scraping completed!");
  process.exit(0);
}

scrapeGoogle().catch(console.error);
