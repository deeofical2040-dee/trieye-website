const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // 1. DESKTOP TEST (1440px)
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/#gallery', { waitUntil: 'networkidle0' });

  const dots = await page.$$('.gallery-dot');
  
  // Card 6 (Graphene Matrix)
  await dots[5].click();
  await new Promise(r => setTimeout(r, 600));
  let galleryEl = await page.$('#gallery');
  if (galleryEl) {
    await galleryEl.screenshot({ path: path.join(__dirname, 'verified_card6_graphene_desktop.png') });
  }

  // Card 7 (Superbike Detailing)
  await dots[6].click();
  await new Promise(r => setTimeout(r, 600));
  galleryEl = await page.$('#gallery');
  if (galleryEl) {
    await galleryEl.screenshot({ path: path.join(__dirname, 'verified_card7_superbike_desktop.png') });
  }

  // 2. MOBILE TEST (iPhone 14 Pro: 390px)
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/#gallery', { waitUntil: 'networkidle0' });

  const mobileDots = await page.$$('.gallery-dot');
  
  // Mobile Card 6
  await mobileDots[5].click();
  await new Promise(r => setTimeout(r, 600));
  galleryEl = await page.$('#gallery');
  if (galleryEl) {
    await galleryEl.screenshot({ path: path.join(__dirname, 'verified_card6_graphene_mobile.png') });
  }

  // Mobile Card 7
  await mobileDots[6].click();
  await new Promise(r => setTimeout(r, 600));
  galleryEl = await page.$('#gallery');
  if (galleryEl) {
    await galleryEl.screenshot({ path: path.join(__dirname, 'verified_card7_superbike_mobile.png') });
  }

  // Check all cards in DOM
  const cardsInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.gallery-card')).map((c, i) => {
      const img = c.querySelector('.gallery-card-inner img');
      return {
        cardIndex: i,
        tag: c.querySelector('.gallery-item-tag')?.textContent,
        title: c.querySelector('.gallery-item-title')?.textContent,
        src: img?.getAttribute('src'),
        objectFit: img ? window.getComputedStyle(img).objectFit : null
      };
    });
  });

  console.log('Cards Info:', JSON.stringify(cardsInfo, null, 2));

  await browser.close();
  console.log('Verification completed.');
})();
