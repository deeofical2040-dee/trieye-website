const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle0' });

  // Click the button using puppeteer page.click
  await page.click('.g-read-more-btn');
  await new Promise(r => setTimeout(r, 200));

  const modalState = await page.evaluate(() => {
    const modal = document.getElementById('reviewModalBackdrop');
    return {
      open: modal ? modal.classList.contains('open') : false,
      author: document.getElementById('reviewModalAuthor')?.innerText,
      avatar: document.getElementById('reviewModalAvatar')?.innerText,
      date: document.getElementById('reviewModalDate')?.innerText,
      body: document.getElementById('reviewModalBody')?.innerText
    };
  });

  console.log('Modal State after click:', modalState);

  // Close modal
  await page.click('#reviewModalClose');
  await new Promise(r => setTimeout(r, 200));

  const closedState = await page.evaluate(() => {
    const modal = document.getElementById('reviewModalBackdrop');
    return modal ? modal.classList.contains('open') : false;
  });

  console.log('Modal is open after close click:', closedState);

  await browser.close();
})();
