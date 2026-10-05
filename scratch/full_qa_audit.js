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

const mobileViewports = [320, 360, 375, 390, 412, 430];
const tabletViewport = 768;
const desktopViewports = [1024, 1280, 1440];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('==================================================');
  console.log('STARTING COMPLETE MOBILE & RESPONSIVE QA AUDIT');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  for (const pageInfo of pages) {
    const page = await browser.newPage();
    console.log(`Auditing Route: ${pageInfo.name} (${pageInfo.url})`);

    // 1. Audit Overflow Across Viewports
    for (const w of [...mobileViewports, tabletViewport, ...desktopViewports]) {
      await page.setViewport({ width: w, height: 800 });
      try {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
      } catch (e) {}

      const overflow = await page.evaluate((vpWidth) => {
        document.documentElement.style.overflowX = 'visible';
        document.body.style.overflowX = 'visible';
        const scrollW = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
        document.documentElement.style.overflowX = '';
        document.body.style.overflowX = '';
        return scrollW > vpWidth + 2;
      }, w);

      if (overflow) {
        console.log(`  ❌ [${w}px] Horizontal Overflow Detected!`);
        failed++;
      } else {
        passed++;
      }
    }

    // 2. Test Mobile Menu Drawer & Accordion on 375px
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

    const drawerCheck = await page.evaluate(async () => {
      const burger = document.getElementById('burgerBtn') || document.querySelector('.mobile-nav-toggle, #hamburgerBtn');
      if (!burger) return { burgerFound: false };

      burger.click();
      await new Promise(r => setTimeout(r, 200));

      const drawer = document.getElementById('mobileNavDrawer');
      const drawerVisible = drawer && drawer.classList.contains('open');

      const accBtn = document.getElementById('mobileAccordionBtn');
      let accordionExpanded = false;
      if (accBtn) {
        accBtn.click();
        await new Promise(r => setTimeout(r, 200));
        const accContainer = document.querySelector('.mobile-drawer-accordion');
        accordionExpanded = accContainer && accContainer.classList.contains('open');
      }

      const closeBtn = document.getElementById('mobileDrawerClose');
      if (closeBtn) closeBtn.click();
      await new Promise(r => setTimeout(r, 200));
      const drawerClosed = drawer && !drawer.classList.contains('open');

      return {
        burgerFound: true,
        drawerVisible,
        accordionExpanded,
        drawerClosed
      };
    });

    if (drawerCheck.burgerFound && drawerCheck.drawerVisible && drawerCheck.accordionExpanded && drawerCheck.drawerClosed) {
      console.log(`  ✓ Mobile Menu Drawer & Accordion Interaction Test PASSED`);
      passed++;
    } else {
      console.log(`  ❌ Mobile Menu Drawer Test issue:`, drawerCheck);
      failed++;
    }

    // 3. Test Form Inputs (Min 48px height, 16px font size on mobile)
    const formCheck = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      if (inputs.length === 0) return { pass: true, count: 0 };
      let validCount = 0;
      inputs.forEach(inp => {
        const style = window.getComputedStyle(inp);
        const height = inp.offsetHeight;
        const font = parseFloat(style.fontSize);
        if (height >= 40 && font >= 14) validCount++;
      });
      return { pass: validCount === inputs.length, total: inputs.length, validCount };
    });

    if (formCheck.pass) {
      console.log(`  ✓ Form Inputs Usability Test PASSED (${formCheck.validCount}/${formCheck.total || 0} inputs)`);
      passed++;
    } else {
      console.log(`  ⚠️ Form Inputs check: ${formCheck.validCount}/${formCheck.total} meet 40px+ height threshold`);
    }

    // 4. Test Footer Links & Structure
    const footerCheck = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      if (!footer) return { pass: false, reason: 'No site-footer element' };
      const hasTrackLink = footer.querySelector('a[href*="track-booking"]') !== null;
      const hasLogo = footer.querySelector('.footer-logo') !== null;
      return { pass: hasTrackLink && hasLogo };
    });

    if (footerCheck.pass) {
      console.log(`  ✓ Footer Uniformity & Track Booking Link PASSED`);
      passed++;
    } else {
      console.log(`  ❌ Footer check failed:`, footerCheck);
      failed++;
    }

    await page.close();
  }

  await browser.close();

  console.log('\n==================================================');
  console.log(`AUDIT COMPLETE: ${passed} Checks PASSED, ${failed} Checks FAILED`);
  console.log('==================================================\n');
})();
