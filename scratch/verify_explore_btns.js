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
  await page.evaluate(() => {
    const el = document.querySelector('.explore-featured-row');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 400));
  
  const element = await page.$('.explore-featured-row');
  if (element) {
    await element.screenshot({ path: path.join(__dirname, 'bike_card_desktop_fixed.png') });
  } else {
    await page.screenshot({ path: path.join(__dirname, 'bike_card_desktop_fixed.png') });
  }

  console.log('Bike card screenshot saved!');
  await browser.close();
})();
