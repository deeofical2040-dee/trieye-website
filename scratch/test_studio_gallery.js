const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'iphone_15_pro_max', width: 430, height: 932 },
    { name: 'iphone_14_pro', width: 390, height: 844 },
    { name: 'iphone_se', width: 375, height: 667 },
    { name: 'small_mobile', width: 320, height: 568 }
  ];

  console.log('--- TESTING TRIEYE STUDIO GALLERY ---');

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/#gallery', { waitUntil: 'networkidle0' });

    // Wait for elements
    await page.waitForSelector('#gallery');
    await page.waitForSelector('.gallery-card');

    // Check overflow
    const overflowInfo = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientWidth = docEl.clientWidth;
      const hasOverflow = scrollWidth > clientWidth;

      const activeCard = document.querySelector('.gallery-card.is-active');
      const activeIndex = activeCard ? activeCard.getAttribute('data-index') : null;
      const tagText = activeCard ? activeCard.querySelector('.gallery-item-tag')?.textContent : '';
      const titleText = activeCard ? activeCard.querySelector('.gallery-item-title')?.textContent : '';

      return {
        clientWidth,
        scrollWidth,
        hasOverflow,
        activeIndex,
        tagText,
        titleText,
        totalCards: document.querySelectorAll('.gallery-card').length,
        totalDots: document.querySelectorAll('.gallery-dot').length,
        hasInstagramElements: !!(
          document.querySelector('.gallery-insta-badge') ||
          document.querySelector('.btn-gallery-follow') ||
          document.querySelector('.gallery-badge-reel') ||
          document.querySelector('.btn-card-ig') ||
          document.querySelector('a[href*="instagram.com"]')
        )
      };
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}):`);
    console.log(`  - Horizontal Overflow: ${overflowInfo.hasOverflow ? 'FAIL (Overflow detected)' : 'PASS (No overflow)'} [scrollWidth=${overflowInfo.scrollWidth}, clientWidth=${overflowInfo.clientWidth}]`);
    console.log(`  - Total Cards: ${overflowInfo.totalCards}, Total Dots: ${overflowInfo.totalDots}`);
    console.log(`  - Active Card [Index ${overflowInfo.activeIndex}]: "${overflowInfo.tagText}" | "${overflowInfo.titleText}"`);
    console.log(`  - In-Gallery Instagram Elements Found: ${overflowInfo.hasInstagramElements ? 'YES (Need cleanup)' : 'NO (Clean)'}`);

    // Take a screenshot of the gallery section
    const gallerySection = await page.$('#gallery');
    if (gallerySection) {
      const screenshotPath = path.join(__dirname, `gallery_${vp.name}.png`);
      await gallerySection.screenshot({ path: screenshotPath });
      console.log(`  - Screenshot saved: ${screenshotPath}`);
    }
  }

  // TEST CAROUSEL INTERACTIONS
  console.log('\n--- TESTING CAROUSEL INTERACTIONS (Next, Prev, Dots, Touch Swipe) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/#gallery', { waitUntil: 'networkidle0' });

  // 1. Click Next Button
  await page.click('#galleryNextBtn');
  await new Promise(r => setTimeout(r, 700));
  let activeIdx = await page.evaluate(() => document.querySelector('.gallery-card.is-active')?.getAttribute('data-index'));
  console.log(`After clicking Next Button: Active Card Index = ${activeIdx} (Expected: 1)`);

  // 2. Click Dot 4 (Index 3)
  const dots = await page.$$('.gallery-dot');
  if (dots.length > 3) {
    await dots[3].click();
    await new Promise(r => setTimeout(r, 700));
    activeIdx = await page.evaluate(() => document.querySelector('.gallery-card.is-active')?.getAttribute('data-index'));
    console.log(`After clicking Dot 4: Active Card Index = ${activeIdx} (Expected: 3)`);
  }

  // 3. Click Prev Button
  await page.click('#galleryPrevBtn');
  await new Promise(r => setTimeout(r, 700));
  activeIdx = await page.evaluate(() => document.querySelector('.gallery-card.is-active')?.getAttribute('data-index'));
  console.log(`After clicking Prev Button: Active Card Index = ${activeIdx} (Expected: 2)`);

  // 4. Test Mobile Touch Swipe
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const container = await page.$('#galleryCarousel');
  const box = await container.boundingBox();

  // Swipe Left (Next)
  const startX = box.x + box.width * 0.8;
  const startY = box.y + box.height * 0.5;
  const endX = box.x + box.width * 0.2;

  await page.touchscreen.tap(startX, startY);
  // Perform drag gesture
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, startY, { steps: 10 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 700));

  activeIdx = await page.evaluate(() => document.querySelector('.gallery-card.is-active')?.getAttribute('data-index'));
  console.log(`After Drag/Swipe gesture: Active Card Index = ${activeIdx}`);

  // 5. Test Global Data Model Exposure for Video Extensibility
  const dataModel = await page.evaluate(() => window.__TRIEYE_GALLERY_ITEMS__);
  console.log(`\nGallery Data Model (Extensibility check):`, dataModel ? `Found ${dataModel.length} items configured` : 'Not found');

  await browser.close();
  console.log('\n--- TESTING COMPLETE ---');
})();
