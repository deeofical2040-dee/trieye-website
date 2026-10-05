const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });

  const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/interior-detailing', { waitUntil: 'networkidle0' });

    // Scroll to Why Trieye section
    await page.evaluate(() => {
      const img = document.querySelector('img[src*="why-trieye-interior.webp"]');
      if (img) img.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: `scratch/interior_edited_${vp.name}.png` });
    console.log(`Saved screenshot: scratch/interior_edited_${vp.name}.png`);
    await page.close();
  }

  await browser.close();
})();
