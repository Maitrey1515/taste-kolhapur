const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true
    });
    const page = await browser.newPage();
    
    let hasError = false;
    page.on('console', msg => {
      if (msg.type() === 'error') {
         console.log('BROWSER LOG ERROR:', msg.text());
         hasError = true;
      }
    });
    page.on('pageerror', err => {
      console.log('BROWSER PAGE ERROR:', err.stack || err.toString());
      hasError = true;
    });
    
    await page.goto('http://localhost:9090/index.html', { waitUntil: 'networkidle0', timeout: 15000 });
    
    const html = await page.content();
    if (html.includes('Top Rated Restaurants') && !hasError) {
      console.log('SUCCESS: Page rendered correctly with no JS errors.');
      await page.screenshot({ path: 'screenshot.webp' });
    } else {
      console.log('FAILED: Page did not render as expected or had errors.');
    }
    
    await browser.close();
  } catch(e) {
    console.error("Script error:", e);
  }
})();
