import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeRestaurantData(page, restaurantName) {
  console.log(`Scraping: ${restaurantName}`);
  
  // Scrape Image
  let imageUrl = null;
  const imageSearchQuery = encodeURIComponent(`${restaurantName} Kolhapur misal food exterior`);
  await page.goto(`https://www.bing.com/images/search?q=${imageSearchQuery}`, { waitUntil: 'networkidle2' });
  
  try {
    const imgSrc = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img.mimg'));
        const validImg = imgs.find(img => img.src && img.src.startsWith('http'));
        return validImg ? validImg.src : null;
    });
    if (imgSrc) imageUrl = imgSrc;
  } catch(e) {
      console.log(`  -> Could not parse image for ${restaurantName}.`);
  }

  console.log(`  -> Found Image: ${imageUrl ? 'Yes' : 'No'}`);
  
  return {
    name: restaurantName,
    cover_image: imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800"
  };
}

async function runLocalScraper() {
  console.log("Reading Misal restaurants from local JSON file...");
  
  const dataPath = path.resolve(__dirname, '../src/data/tastekolhapur_master_data.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const misalHotels = JSON.parse(rawData);
  
  console.log(`Found ${misalHotels.length} Misal restaurants to scrape.`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const results = [];

  for (const row of misalHotels) {
    const name = row.name;
    if (!name) continue;
    
    const data = await scrapeRestaurantData(page, name);
    results.push(data);
    
    // Write partial results to local JSON progressively
    fs.writeFileSync(path.resolve(__dirname, '../local_misal_images.json'), JSON.stringify(results, null, 2));
    
    // 2-second delay to be safe
    await delay(2000);
  }

  await browser.close();
  console.log("\nScraping complete! Misal images saved to local_misal_images.json");
  process.exit(0);
}

runLocalScraper().catch(console.error);
