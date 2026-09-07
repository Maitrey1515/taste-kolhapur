const puppeteer = require('puppeteer-core');

(async () => {
  try {
    console.log("Launching Edge...");
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.toString()));
    
    console.log("Navigating to Vercel...");
    await page.goto('https://taste-kolhapur1.vercel.app', { waitUntil: 'networkidle2', timeout: 15000 });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const html = await page.evaluate(() => document.body.innerHTML);
    const text = await page.evaluate(() => document.body.innerText);
    console.log('HTML Length:', html.length);
    console.log('Text preview:', text.substring(0, 200));
    
    await browser.close();
  } catch(e) {
    console.error("Script error:", e);
  }
})();
