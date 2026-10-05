const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('==================================================');
  console.log('VERIFYING INTERIOR DETAILING MOBILE SECTION');
  console.log('==================================================\n');

  // TEST 1: MOBILE VIEWPORT (375px)
  const pageMob = await browser.newPage();
  await pageMob.setViewport({ width: 375, height: 800 });
  await pageMob.goto('http://localhost:3000/interior-detailing.html', { waitUntil: 'domcontentloaded' });

  const mobData = await pageMob.evaluate(() => {
    const header = document.querySelector('.intro-header');
    const media = document.querySelector('.intro-media');
    const body = document.querySelector('.intro-body');
    const img = document.querySelector('.intro-img');
    const para = document.querySelector('.intro-body p');

    const headerRect = header ? header.getBoundingClientRect() : null;
    const mediaRect = media ? media.getBoundingClientRect() : null;
    const bodyRect = body ? body.getBoundingClientRect() : null;
    const paraRect = para ? para.getBoundingClientRect() : null;

    // Verify vertical order: Header Top < Media Top < Body Top
    const correctOrder = headerRect && mediaRect && bodyRect && 
                         (headerRect.top < mediaRect.top) && 
                         (mediaRect.top < bodyRect.top);

    return {
      correctOrder,
      imgWidth: mediaRect ? Math.round(mediaRect.width) : 0,
      paraWidth: paraRect ? Math.round(paraRect.width) : 0,
      headerTop: headerRect ? Math.round(headerRect.top) : 0,
      mediaTop: mediaRect ? Math.round(mediaRect.top) : 0,
      bodyTop: bodyRect ? Math.round(bodyRect.top) : 0
    };
  });

  console.log('MOBILE (375px) INTERIOR SECTION:');
  console.log(`   - Vertical Order (Title -> Image -> Body): ${mobData.correctOrder ? '✓ PASSED' : '❌ FAILED'}`);
  console.log(`   - Image Width: ${mobData.imgWidth}px (Full container width)`);
  console.log(`   - Paragraph Width: ${mobData.paraWidth}px (Full container width)`);
  console.log(`   - Vertical positions: Title=${mobData.headerTop}px, Image=${mobData.mediaTop}px, Body=${mobData.bodyTop}px`);

  // Capture screenshot of mobile section
  const introSec = await pageMob.$('#intro');
  if (introSec) {
    const mobOut = '/Users/apple/.gemini/antigravity-ide/brain/668b1304-79ba-4043-812b-f321e69bcfec/scratch/mobile_interior_section.png';
    await introSec.screenshot({ path: mobOut });
    console.log(`   - Saved mobile screenshot to: ${mobOut}`);
  }

  // TEST 2: DESKTOP VIEWPORT (1280px)
  const pageDesk = await browser.newPage();
  await pageDesk.setViewport({ width: 1280, height: 800 });
  await pageDesk.goto('http://localhost:3000/interior-detailing.html', { waitUntil: 'domcontentloaded' });

  const deskData = await pageDesk.evaluate(() => {
    const header = document.querySelector('.intro-header');
    const media = document.querySelector('.intro-media');
    const body = document.querySelector('.intro-body');

    const headerRect = header ? header.getBoundingClientRect() : null;
    const mediaRect = media ? media.getBoundingClientRect() : null;
    const bodyRect = body ? body.getBoundingClientRect() : null;

    // On desktop: Header & Body on left (left ~ 60px), Media on right (left ~ 660px)
    const isSplit = headerRect && mediaRect && (mediaRect.left > headerRect.left + 300);

    return {
      isSplit,
      headerLeft: headerRect ? Math.round(headerRect.left) : 0,
      mediaLeft: mediaRect ? Math.round(mediaRect.left) : 0
    };
  });

  console.log('\nDESKTOP (1280px) INTERIOR SECTION:');
  console.log(`   - Desktop Split Layout Preserved: ${deskData.isSplit ? '✓ PASSED' : '❌ FAILED'}`);
  console.log(`   - Left col position: ${deskData.headerLeft}px, Right col position: ${deskData.mediaLeft}px`);

  await browser.close();

  console.log('\n==================================================');
  console.log('VERIFICATION COMPLETE');
  console.log('==================================================\n');
})();
