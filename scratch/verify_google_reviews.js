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

  console.log('Verifying Google Reviews Redesign across viewports...');

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
    
    // Check section existence and metrics
    const res = await page.evaluate((w) => {
      const sec = document.getElementById('reviews');
      if (!sec) return { found: false };

      const heading = sec.querySelector('.g-heading-main')?.innerText.replace(/\n/g, ' ');
      const rating = sec.querySelector('.g-rating-text')?.innerText;
      const btn = sec.querySelector('.g-see-all-btn')?.innerText;
      const btnHref = sec.querySelector('.g-see-all-btn')?.getAttribute('href');
      const row1Visible = window.getComputedStyle(document.querySelector('.marquee-row-1')).display !== 'none';
      const row2Visible = window.getComputedStyle(document.querySelector('.marquee-row-2')).display !== 'none';
      const bodyOverflow = document.body.scrollWidth > w;

      return {
        found: true,
        heading,
        rating,
        btn,
        btnHrefValid: !!btnHref && btnHref.includes('google.com/maps'),
        row1Visible,
        row2Visible,
        bodyOverflow
      };
    }, vp.width);

    console.log(`\n[Viewport ${vp.name} (${vp.width}px)]`);
    console.log(`  Found section: ${res.found}`);
    console.log(`  Heading: "${res.heading}"`);
    console.log(`  Rating: "${res.rating}"`);
    console.log(`  Button: "${res.btn}" (Link valid: ${res.btnHrefValid})`);
    console.log(`  Rows visible: Row 1 = ${res.row1Visible}, Row 2 = ${res.row2Visible}`);
    console.log(`  Page horizontal overflow: ${res.bodyOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);
  }

  await browser.close();
  console.log('\nVerification complete!');
})();
