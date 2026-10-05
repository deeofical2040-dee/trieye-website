const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });

  const viewports = [
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Mobile-375', width: 375, height: 667 },
    { name: 'Mobile-320', width: 320, height: 568 }
  ];

  const routes = [
    'http://localhost:3000/',
    'http://localhost:3000/car-wash',
    'http://localhost:3000/ceramic-coating',
    'http://localhost:3000/graphene-coating',
    'http://localhost:3000/paint-correction',
    'http://localhost:3000/interior-detailing',
    'http://localhost:3000/ppf',
    'http://localhost:3000/bike-detailing',
    'http://localhost:3000/track-booking'
  ];

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}px) ===`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const url of routes) {
      await page.goto(url, { waitUntil: 'networkidle0' });

      // Check horizontal scrollbar
      const hasHScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Scroll to trigger reveal animations
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, 50);
        });
      });

      // Count revealed elements
      const revealStats = await page.evaluate(() => {
        const total = document.querySelectorAll('.reveal-text, .reveal-up, .reveal-left, .reveal-right, .reveal-card').length;
        const revealed = document.querySelectorAll('.is-visible, .revealed').length;
        return { total, revealed };
      });

      console.log(`Route: ${url.replace('http://localhost:3000', '') || '/'} | Horizontal Scrollbar: ${hasHScroll ? 'FAIL (Overflow)' : 'PASS (Zero Overflow)'} | Revealed Elements: ${revealStats.revealed}/${revealStats.total}`);
    }
    await page.close();
  }

  await browser.close();
})();
