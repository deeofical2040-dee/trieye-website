const puppeteer = require('puppeteer');

const pages = [
  { name: 'Home', url: 'http://localhost:3000/index.html' },
  { name: 'Car Wash', url: 'http://localhost:3000/car-wash.html' },
  { name: 'Ceramic Coating', url: 'http://localhost:3000/ceramic-coating.html' },
  { name: 'Graphene Coating', url: 'http://localhost:3000/graphene-coating.html' },
  { name: 'Paint Correction', url: 'http://localhost:3000/paint-correction.html' },
  { name: 'Interior Detailing', url: 'http://localhost:3000/interior-detailing.html' },
  { name: 'PPF', url: 'http://localhost:3000/ppf.html' },
  { name: 'Bike Detailing', url: 'http://localhost:3000/bike-detailing.html' },
  { name: 'Track Booking', url: 'http://localhost:3000/track-booking.html' }
];

const viewports = [320, 360, 375, 390, 412, 430, 768, 1024];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('Starting Deep Mobile Audit (disabling overflow-x clip/hidden)...');

  for (const pageInfo of pages) {
    const page = await browser.newPage();
    console.log(`\n==================================================`);
    console.log(`Auditing: ${pageInfo.name} (${pageInfo.url})`);

    for (const width of viewports) {
      await page.setViewport({ width, height: 800 });
      try {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
      } catch (e) {}

      // Temporarily remove overflow-x constraints from html, body and containers
      const overflowData = await page.evaluate((vpWidth) => {
        document.documentElement.style.overflowX = 'visible';
        document.body.style.overflowX = 'visible';
        
        const bodyWidth = document.body.scrollWidth;
        const docWidth = document.documentElement.scrollWidth;
        const maxScrollWidth = Math.max(bodyWidth, docWidth);
        const overflow = maxScrollWidth > vpWidth + 2;
        
        const overflowingElements = [];
        const allEls = document.querySelectorAll('*');
        allEls.forEach(el => {
          // Ignore SVG paths, g tags, etc.
          if (['path', 'g', 'svg', 'head', 'script', 'style', 'link'].includes(el.tagName.toLowerCase())) return;
          const rect = el.getBoundingClientRect();
          if (rect.right > vpWidth + 2) {
            overflowingElements.push({
              tag: el.tagName.toLowerCase(),
              id: el.id,
              className: (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : '',
              right: Math.round(rect.right),
              width: Math.round(rect.width)
            });
          }
        });

        // Restore styles
        document.documentElement.style.overflowX = '';
        document.body.style.overflowX = '';

        return {
          overflow,
          maxScrollWidth,
          overflowingElements: overflowingElements.slice(0, 8)
        };
      }, width);

      if (overflowData.overflow) {
        console.log(`  ❌ [${width}px] REAL OVERFLOW: maxScrollWidth=${overflowData.maxScrollWidth}px > viewport=${width}px`);
        overflowData.overflowingElements.forEach(item => {
          console.log(`      <${item.tag} id="${item.id}" class="${item.className}"> right=${item.right}px width=${item.width}px`);
        });
      } else {
        console.log(`  ✓ [${width}px] Clean layout (no hidden overflow)`);
      }
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nDeep audit finished.`);
})();
