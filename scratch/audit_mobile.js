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

const viewports = [320, 360, 375, 390, 412, 430, 768, 1024, 1280];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('Starting Mobile Audit...');
  let totalIssues = 0;

  for (const pageInfo of pages) {
    const page = await browser.newPage();
    console.log(`\n==================================================`);
    console.log(`Auditing: ${pageInfo.name} (${pageInfo.url})`);

    for (const width of viewports) {
      await page.setViewport({ width, height: 800 });
      try {
        await page.goto(pageInfo.url, { waitUntil: 'networkidle0', timeout: 10000 });
      } catch (e) {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
      }

      // Check overflow
      const overflowData = await page.evaluate((vpWidth) => {
        const bodyWidth = document.body.scrollWidth;
        const docWidth = document.documentElement.scrollWidth;
        const overflow = Math.max(bodyWidth, docWidth) > vpWidth;
        
        // Find overflowing elements
        const overflowingElements = [];
        if (overflow) {
          const allEls = document.querySelectorAll('*');
          allEls.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > vpWidth + 1) { // 1px threshold
              overflowingElements.push({
                tag: el.tagName,
                id: el.id,
                className: el.className ? el.className.toString().slice(0, 40) : '',
                right: rect.right,
                width: rect.width
              });
            }
          });
        }
        return {
          overflow,
          scrollWidth: Math.max(bodyWidth, docWidth),
          overflowingElements: overflowingElements.slice(0, 5) // top 5
        };
      }, width);

      if (overflowData.overflow) {
        totalIssues++;
        console.log(`  ❌ [${width}px] OVERFLOW: scrollWidth=${overflowData.scrollWidth}px > viewport=${width}px`);
        overflowData.overflowingElements.forEach(item => {
          console.log(`      El: <${item.tag.toLowerCase()} id="${item.id}" class="${item.className}"> right=${item.right.toFixed(1)}px width=${item.width.toFixed(1)}px`);
        });
      } else {
        console.log(`  ✓ [${width}px] No overflow`);
      }
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nAudit finished with ${totalIssues} overflow issues.`);
})();
