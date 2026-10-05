const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });
  
  // Click hamburger button to open drawer
  await page.click('#burgerBtn');
  await new Promise(r => setTimeout(r, 400));

  const drawer = await page.$('#mobileNavDrawer');
  if (drawer) {
    await drawer.screenshot({ path: path.join(__dirname, 'mobile_drawer_fixed.png') });
  } else {
    await page.screenshot({ path: path.join(__dirname, 'mobile_drawer_fixed.png') });
  }

  console.log('Mobile drawer screenshot saved!');
  await browser.close();
})();
