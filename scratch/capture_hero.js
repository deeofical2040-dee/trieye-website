const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });

  const hero = await page.$('.hero');
  if (hero) {
    const outPath = '/Users/apple/.gemini/antigravity-ide/brain/668b1304-79ba-4043-812b-f321e69bcfec/scratch/desktop_hero_clarity.png';
    await hero.screenshot({ path: outPath });
    console.log('Saved hero screenshot to:', outPath);
  }

  await browser.close();
})();
