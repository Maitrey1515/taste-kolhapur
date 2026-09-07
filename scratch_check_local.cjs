const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true
    });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
         console.log('BROWSER LOG ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log('BROWSER PAGE ERROR:', err.stack || err.toString());
    });
    
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
  } catch(e) {
    console.error("Script error:", e);
  }
})();
