const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/paint-correction', { waitUntil: 'networkidle0' });
  
  // Smooth scroll down to record frames
  const framesDir = path.join(__dirname, 'frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);
  
  let frameCount = 0;
  
  // Scroll down smoothly
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => window.scrollBy(0, 60));
    await new Promise(r => setTimeout(r, 100));
    const screenshot = await page.screenshot({ path: path.join(framesDir, `frame_${String(frameCount).padStart(3, '0')}.png`) });
    frameCount++;
  }

  await browser.close();
  console.log(`Captured ${frameCount} frames.`);
})();
