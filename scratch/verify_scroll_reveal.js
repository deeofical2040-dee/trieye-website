const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });

  // 1. Check Hero Section is immediately visible (not hidden by reveal)
  const heroOpacity = await page.evaluate(() => {
    const heroTitle = document.querySelector('.hero-title');
    return heroTitle ? window.getComputedStyle(heroTitle).opacity : null;
  });
  console.log(`Hero Title Initial Opacity: ${heroOpacity} (Expected: 1)`);

  // 2. Scroll down to trigger reveal
  await page.evaluate(() => {
    window.scrollTo({ top: 800, behavior: 'smooth' });
  });
  await new Promise(r => setTimeout(r, 800));

  const revealedCount = await page.evaluate(() => {
    return document.querySelectorAll('.reveal-element.revealed').length;
  });
  console.log(`Revealed elements count after scroll: ${revealedCount}`);

  await page.screenshot({ path: path.join(__dirname, 'scroll_reveal_desktop.png') });

  // 3. Test Mobile viewport
  await page.setViewport({ width: 375, height: 812 });
  await page.evaluate(() => {
    window.scrollTo({ top: 1200, behavior: 'smooth' });
  });
  await new Promise(r => setTimeout(r, 800));

  const mobileOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log(`Mobile Horizontal Overflow: ${mobileOverflow ? 'FAIL (Overflow)' : 'PASS (No Overflow)'}`);

  await page.screenshot({ path: path.join(__dirname, 'scroll_reveal_mobile.png') });

  console.log('Scroll reveal verification complete!');
  await browser.close();
})();
