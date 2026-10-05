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
    const footer = document.querySelector('.footer-socials');
    if (footer) footer.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 500));
  const element = await page.$('.footer-socials');
  if (element) {
    await element.screenshot({ path: path.join(__dirname, 'social_icons_colored.png') });
  } else {
    await page.screenshot({ path: path.join(__dirname, 'social_icons_colored.png') });
  }

  console.log('Social icon screenshot saved!');
  await browser.close();
})();
