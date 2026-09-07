import puppeteer from 'puppeteer';

(async () => {
  console.log("Starting browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

  console.log("Navigating to URL...");
  await page.goto('https://taste-kolhapur1.vercel.app', { waitUntil: 'networkidle2' });
  
  console.log("Waiting 3 seconds just in case...");
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
  console.log("Done.");
})();
