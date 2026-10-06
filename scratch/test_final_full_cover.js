const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'iphone_14_pro', width: 390, height: 844 },
    { name: 'iphone_se', width: 375, height: 667 },
    { name: 'small_mobile', width: 320, height: 568 }
  ];

  console.log('--- TESTING FINAL STUDIO GALLERY FULL COVER ---');

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/#gallery', { waitUntil: 'networkidle0' });

    // Rotate to Card 6 (Index 5 - Graphene)
    const dots = await page.$$('.gallery-dot');
    await dots[5].click();
    await new Promise(r => setTimeout(r, 600));

    let galleryEl = await page.$('#gallery');
    if (galleryEl) {
      await galleryEl.screenshot({ path: path.join(__dirname, `final_card6_graphene_${vp.name}.png`) });
    }

    // Rotate to Card 7 (Index 6 - Superbike)
    await dots[6].click();
    await new Promise(r => setTimeout(r, 600));

    galleryEl = await page.$('#gallery');
    if (galleryEl) {
      await galleryEl.screenshot({ path: path.join(__dirname, `final_card7_superbike_${vp.name}.png`) });
    }
  }

  // Verify object-fit on all cards
  const cardStyles = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.gallery-card'));
    return cards.map((c, i) => {
      const img = c.querySelector('.gallery-card-inner img');
      return {
        index: i,
        tag: c.querySelector('.gallery-item-tag')?.textContent,
        src: img ? img.getAttribute('src') : null,
        objectFit: img ? window.getComputedStyle(img).objectFit : null,
        objectPosition: img ? window.getComputedStyle(img).objectPosition : null
      };
    });
  });

  console.log('Gallery Cards Configuration:');
  console.log(JSON.stringify(cardStyles, null, 2));

  await browser.close();
  console.log('Testing complete.');
})();
