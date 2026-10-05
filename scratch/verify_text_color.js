const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(__dirname, 'hero_text_contrast_check.png') });

  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(__dirname, 'hero_text_contrast_mobile.png') });

  console.log('Screenshots saved!');
  await browser.close();
})();
