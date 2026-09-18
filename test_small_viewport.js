const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Test 320px width
  await page.setViewport({ width: 320, height: 800 });
  await page.goto('file:///Users/apple/Documents/Trieye /index.html', { waitUntil: 'networkidle0' });
  
  // Hide splash screen to see the content immediately if there is one
  await page.evaluate(() => {
    const splash = document.querySelector('.splash-screen');
    if (splash) splash.style.display = 'none';
    document.body.style.overflow = 'auto'; // allow scrolling
  });
  
  // Wait a moment for rendering
  await new Promise(r => setTimeout(r, 1000));
  
  // Take screenshot of FAQ section
  const faq = await page.$('.faq-section');
  if (faq) {
    await faq.screenshot({ path: '/Users/apple/.gemini/antigravity-ide/brain/40660d53-e325-4407-b0f1-edd167b0d348/scratch/faq_320px.png' });
  }
  
  // Take screenshot of footer
  const footer = await page.$('.site-footer');
  if (footer) {
    await footer.screenshot({ path: '/Users/apple/.gemini/antigravity-ide/brain/40660d53-e325-4407-b0f1-edd167b0d348/scratch/footer_320px.png' });
  }

  // Take a full page screenshot to check for overflow
  await page.screenshot({ path: '/Users/apple/.gemini/antigravity-ide/brain/40660d53-e325-4407-b0f1-edd167b0d348/scratch/fullpage_320px.png', fullPage: true });

  await browser.close();
  console.log("Screenshots captured for 320px viewport.");
})();
