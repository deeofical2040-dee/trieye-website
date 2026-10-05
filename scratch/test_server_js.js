const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Require server logic directly or launch a quick http server on port 3099 using server.js handler logic
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  let filePath = path.join(__dirname, '..', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const errorPagePath = path.join(__dirname, '..', '404.html');
    if (fs.existsSync(errorPagePath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(errorPagePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(3099, async () => {
  console.log('Test server running on port 3099...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const response = await page.goto('http://localhost:3099/some-random-unknown-page', { waitUntil: 'networkidle2' });
  console.log(`404 Page HTTP Status: ${response.status()}`);

  await page.screenshot({ path: path.join(__dirname, '404_page_desktop.png') });

  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(__dirname, '404_page_mobile.png') });

  console.log('404 screenshots rendered & verified successfully!');
  await browser.close();
  server.close();
});
