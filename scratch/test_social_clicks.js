const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });

  const socialLinks = await page.evaluate(() => {
    const icons = document.querySelectorAll('.footer-socials .social-icon');
    return Array.from(icons).map(a => ({
      ariaLabel: a.getAttribute('aria-label'),
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      clickable: window.getComputedStyle(a).pointerEvents !== 'none'
    }));
  });

  console.log('Social Links Click Audit:');
  socialLinks.forEach(item => {
    console.log(`  - [${item.ariaLabel}] href="${item.href}" target="${item.target || 'self'}" clickable=${item.clickable}`);
  });

  await browser.close();
})();
