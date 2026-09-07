const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => {
    return {
      topRestaurants: document.getElementById('top-restaurants-grid').innerHTML.trim(),
      events: document.getElementById('events-grid').innerHTML.trim()
    };
  });
  
  console.log('CONTENT:', content);
  
  await browser.close();
})();
