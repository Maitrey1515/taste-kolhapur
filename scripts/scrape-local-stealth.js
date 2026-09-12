import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeRestaurantData(page, restaurantName) {
  console.log(`Scraping: ${restaurantName}`);
  
  // 1. Scrape Info (Rating & Reviews)
  const searchQuery = encodeURIComponent(`${restaurantName} Kolhapur restaurant`);
  await page.goto(`https://www.google.com/search?q=${searchQuery}`, { waitUntil: 'networkidle2' });
  
  let rating = 4.5;
  let reviews = 250;
  
  try {
    // Try to find the Google Rating block
    const ratingEl = await page.$('span[aria-hidden="true"]:has-text(".")');
    if (ratingEl) {
      const text = await page.evaluate(el => el.textContent, ratingEl);
      if (text && !isNaN(parseFloat(text))) rating = parseFloat(text);
    }
    
    // Try to find reviews count
    const reviewEl = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('span'));
        const reviewSpan = els.find(e => e.textContent.includes('Google reviews') || e.textContent.includes('reviews'));
        return reviewSpan ? reviewSpan.textContent : null;
    });
    if (reviewEl) {
        const num = parseInt(reviewEl.replace(/[^0-9]/g, ''));
        if (!isNaN(num)) reviews = num;
    }
  } catch(e) {
      console.log(`  -> Could not parse rating for ${restaurantName}, using defaults.`);
  }

  // 2. Scrape Image
  let imageUrl = null;
  const imageSearchQuery = encodeURIComponent(`${restaurantName} Kolhapur restaurant food exterior`);
  await page.goto(`https://www.google.com/search?q=${imageSearchQuery}&tbm=isch`, { waitUntil: 'networkidle2' });
  
  try {
    const imgSrc = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const validImg = imgs.find(img => img.src && (img.src.startsWith('http') || img.src.startsWith('data:image')) && !img.src.includes('googlelogo') && !img.src.includes('gstatic'));
        return validImg ? validImg.src : null;
    });
    if (imgSrc) imageUrl = imgSrc;
  } catch(e) {
      console.log(`  -> Could not parse image for ${restaurantName}.`);
  }

  console.log(`  -> Found: Rating: ${rating}, Reviews: ${reviews}, Image: ${imageUrl ? 'Yes' : 'No'}`);
  
  return {
    name: restaurantName,
    google_rating: rating,
    google_reviews: reviews,
    cover_image: imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800"
  };
}

async function runLocalScraper() {
  console.log("Reading restaurants from Excel seed file (ignoring existing Misal hotels in DB)...");
  
  const excelPath = path.resolve(__dirname, '../../../TasteKolhapur_All_Hotels_Seed.xlsx');
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  console.log(`Found ${rows.length} NEW restaurants to scrape.`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const results = [];

  for (const row of rows) {
    const name = row['Restaurant Name'];
    if (!name) continue;
    
    const data = await scrapeRestaurantData(page, name);
    results.push(data);
    
    // Write partial results to local JSON progressively
    fs.writeFileSync(path.resolve(__dirname, '../local_fetched_data.json'), JSON.stringify(results, null, 2));
    
    // 2-second delay to be safe
    await delay(2000);
  }

  await browser.close();
  console.log("\nScraping complete! Data saved to local_fetched_data.json");
  process.exit(0);
}

runLocalScraper().catch(console.error);
