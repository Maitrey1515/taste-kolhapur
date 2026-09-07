const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true
    });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Wait for a second just in case
    await new Promise(r => setTimeout(r, 1000));
    
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log('HTML CONTENT:');
    console.log(html);
    
    await browser.close();
  } catch(e) {
    console.error("Script error:", e);
  }
})();
