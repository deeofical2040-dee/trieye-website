const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });

  // 1. Check hamburger visibility and click
  const hamburger = await page.$('.mobile-nav-toggle, .hamburger-toggle, #hamburgerBtn, button[aria-label*="menu"]');
  console.log('Hamburger button found:', !!hamburger);

  if (hamburger) {
    await hamburger.click();
    await new Promise(r => setTimeout(r, 300));
    
    // Check if drawer opens
    const drawerVisible = await page.evaluate(() => {
      const drawer = document.querySelector('.mobile-nav-drawer, .mobile-menu, #mobileNavDrawer');
      if (!drawer) return false;
      const style = window.getComputedStyle(drawer);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
    console.log('Mobile drawer visible after tap:', drawerVisible);

    // Test accordion expansion
    const accordionBtn = await page.$('.mobile-accordion-btn');
    if (accordionBtn) {
      await accordionBtn.click();
      await new Promise(r => setTimeout(r, 200));
      const isExpanded = await page.evaluate(() => {
        const btn = document.querySelector('.mobile-accordion-btn');
        return btn ? btn.getAttribute('aria-expanded') === 'true' : false;
      });
      console.log('Services accordion expanded:', isExpanded);
    }
  }

  await browser.close();
})();
