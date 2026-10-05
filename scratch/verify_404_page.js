const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');

const PORT = 3000; // also test 8080

(async () => {
  const checkPort = (port) => new Promise(resolve => {
    http.get(`http://localhost:${port}/random-non-existent-route-check-404`, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ port, status: res.statusCode, bodySnippet: body.substring(0, 100) }));
    }).on('error', e => resolve({ port, error: e.message }));
  });

  const res3000 = await checkPort(3000);
  const res8080 = await checkPort(8080);

  console.log('Port 3000 check:', res3000);
  console.log('Port 8080 check:', res8080);

  const activePort = res8080.status === 404 && res8080.bodySnippet.includes('<!DOCTYPE html>') ? 8080 : 3000;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const response = await page.goto(`http://localhost:${activePort}/some-random-unknown-page`, { waitUntil: 'networkidle2' });
  const pageStatus = response.status();

  await page.screenshot({ path: path.join(__dirname, '404_page_desktop.png') });

  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(__dirname, '404_page_mobile.png') });

  console.log(`Puppeteer Active Port: ${activePort}, Status: ${pageStatus}`);
  console.log('404 screenshots saved!');
  await browser.close();
})();
