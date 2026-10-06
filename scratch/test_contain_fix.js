const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // 1. DESKTOP TEST
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/#gallery', { waitUntil: 'networkidle0' });

  // Rotate to Card 6 (Index 5 - Graphene)
  const dots = await page.$$('.gallery-dot');
  await dots[5].click();
  await new Promise(r => setTimeout(r, 800));

  const card6Desktop = await page.$('#gallery');
  if (card6Desktop) {
    await card6Desktop.screenshot({ path: path.join(__dirname, 'card6_graphene_desktop.png') });
    console.log('Saved card6_graphene_desktop.png');
  }

  // Rotate to Card 7 (Index 6 - Superbike)
  await dots[6].click();
  await new Promise(r => setTimeout(r, 800));

  const card7Desktop = await page.$('#gallery');
  if (card7Desktop) {
    await card7Desktop.screenshot({ path: path.join(__dirname, 'card7_superbike_desktop.png') });
    console.log('Saved card7_superbike_desktop.png');
  }

  // 2. MOBILE TEST (iPhone 14 Pro: 390px)
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/#gallery', { waitUntil: 'networkidle0' });

  const mobileDots = await page.$$('.gallery-dot');
  await mobileDots[5].click();
  await new Promise(r => setTimeout(r, 800));

  const card6Mobile = await page.$('#gallery');
  if (card6Mobile) {
    await card6Mobile.screenshot({ path: path.join(__dirname, 'card6_graphene_mobile.png') });
    console.log('Saved card6_graphene_mobile.png');
  }

  await mobileDots[6].click();
  await new Promise(r => setTimeout(r, 800));

  const card7Mobile = await page.$('#gallery');
  if (card7Mobile) {
    await card7Mobile.screenshot({ path: path.join(__dirname, 'card7_superbike_mobile.png') });
    console.log('Saved card7_superbike_mobile.png');
  }

  // Check CSS computed styles
  const stylesCheck = await page.evaluate(() => {
    const card6MainImg = document.querySelector('.gallery-card[data-index="5"] .gallery-card-main-img');
    const card7MainImg = document.querySelector('.gallery-card[data-index="6"] .gallery-card-main-img');
    const card1Img = document.querySelector('.gallery-card[data-index="0"] .gallery-card-inner img');

    return {
      card6MainImgFit: card6MainImg ? window.getComputedStyle(card6MainImg).objectFit : null,
      card7MainImgFit: card7MainImg ? window.getComputedStyle(card7MainImg).objectFit : null,
      card1ImgFit: card1Img ? window.getComputedStyle(card1Img).objectFit : null,
    };
  });

  console.log('\nComputed Object-Fit Styles:');
  console.log('  - Card 06 (Graphene):', stylesCheck.card6MainImgFit, '(Expected: contain)');
  console.log('  - Card 07 (Superbike):', stylesCheck.card7MainImgFit, '(Expected: contain)');
  console.log('  - Card 01 (Foam Wash):', stylesCheck.card1ImgFit, '(Expected: cover)');

  await browser.close();
  console.log('Test completed successfully.');
})();
