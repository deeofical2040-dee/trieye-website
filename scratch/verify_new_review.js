const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile_320', width: 320, height: 800 },
    { name: 'mobile_375', width: 375, height: 800 },
    { name: 'mobile_390', width: 390, height: 800 },
    { name: 'mobile_430', width: 430, height: 800 }
  ];

  console.log('Verifying Bhoovaragan Venugopal review card across viewports...');

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
    
    const res = await page.evaluate((w) => {
      const sec = document.getElementById('reviews');
      if (!sec) return { found: false };

      // Find Bhoovaragan card
      const allNames = Array.from(sec.querySelectorAll('.g-author-name')).map(el => el.innerText.trim());
      const hasBhoovaragan = allNames.includes('Bhoovaragan Venugopal');
      
      // Check card heights
      const cards = Array.from(sec.querySelectorAll('.g-review-card-item'));
      const heights = cards.map(c => c.offsetHeight);
      const maxHeight = Math.max(...heights);
      const minHeight = Math.min(...heights);
      const heightDifference = maxHeight - minHeight;

      // Check Read more button existence
      const readMoreBtn = sec.querySelector('.g-read-more-btn');

      // Check body horizontal overflow
      const bodyOverflow = document.body.scrollWidth > w;

      return {
        found: true,
        hasBhoovaragan,
        cardCount: cards.length,
        heightDifference,
        hasReadMoreBtn: !!readMoreBtn,
        bodyOverflow
      };
    }, vp.width);

    console.log(`\n[Viewport ${vp.name} (${vp.width}px)]`);
    console.log(`  Found section: ${res.found}`);
    console.log(`  Has Bhoovaragan Venugopal card: ${res.hasBhoovaragan}`);
    console.log(`  Total cards rendered (with loops): ${res.cardCount}`);
    console.log(`  Card height delta across row: ${res.heightDifference}px`);
    console.log(`  Read more button present: ${res.hasReadMoreBtn}`);
    console.log(`  Page horizontal overflow: ${res.bodyOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);
  }

  // Test modal interaction
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });

  const modalTest = await page.evaluate(async () => {
    const btn = document.querySelector('.g-read-more-btn');
    if (!btn) return { error: 'No read more btn' };
    btn.click();
    
    const modal = document.getElementById('reviewModalBackdrop');
    const isModalOpen = modal && modal.classList.contains('open');
    const author = document.getElementById('reviewModalAuthor')?.innerText;
    const body = document.getElementById('reviewModalBody')?.innerText;
    const date = document.getElementById('reviewModalDate')?.innerText;

    // Test close
    document.getElementById('reviewModalClose')?.click();
    const isClosed = !modal.classList.contains('open');

    return {
      isModalOpen,
      author,
      date,
      bodyPreview: body ? body.substring(0, 60) + '...' : '',
      isClosed
    };
  });

  console.log('\n[Modal Interaction Test]');
  console.log(`  Modal opened on click: ${modalTest.isModalOpen}`);
  console.log(`  Author in modal: "${modalTest.author}"`);
  console.log(`  Date in modal: "${modalTest.date}"`);
  console.log(`  Body text snippet: "${modalTest.bodyPreview}"`);
  console.log(`  Modal closed on close click: ${modalTest.isClosed}`);

  await browser.close();
  console.log('\nVerification complete!');
})();
