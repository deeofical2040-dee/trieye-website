const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== PHASE 4 COMPREHENSIVE QA & REGRESSION AUDIT ===\n');

// 1. Test 404 route on active server
http.get('http://localhost:3000/some-unknown-random-route', res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log(`[404 TEST] HTTP Status: ${res.statusCode} (Expected: 404)`);
    console.log(`[404 TEST] Custom Branded Body: ${body.includes('THIS ROAD') ? 'PASS' : 'FAIL'}`);
    console.log(`[404 TEST] Home CTA Link: ${body.includes('href="/"') ? 'PASS' : 'FAIL'}`);
    console.log(`[404 TEST] Services CTA Link: ${body.includes('href="/#services"') ? 'PASS' : 'FAIL'}`);
  });
}).on('error', e => console.log('404 Test Error:', e.message));

// 2. Check Phase 1-3 assets
const sitemapExists = fs.existsSync(path.join(__dirname, '..', 'sitemap.xml'));
const robotsExists = fs.existsSync(path.join(__dirname, '..', 'robots.txt'));
const page404Exists = fs.existsSync(path.join(__dirname, '..', '404.html'));

console.log(`[ASSETS] sitemap.xml: ${sitemapExists ? 'PASS' : 'FAIL'}`);
console.log(`[ASSETS] robots.txt: ${robotsExists ? 'PASS' : 'FAIL'}`);
console.log(`[ASSETS] 404.html: ${page404Exists ? 'PASS' : 'FAIL'}`);

// 3. Page Level Regression Checks
const pages = [
  'index.html',
  'car-wash.html',
  'ceramic-coating.html',
  'graphene-coating.html',
  'paint-correction.html',
  'interior-detailing.html',
  'ppf.html',
  'bike-detailing.html'
];

pages.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const html = fs.readFileSync(filePath, 'utf-8');

  const hasCanonical = html.includes('rel="canonical"');
  const hasOgUrl = html.includes('property="og:url"');
  const hasTwitter = html.includes('name="twitter:card"');
  const hasLdJson = html.includes('type="application/ld+json"');
  const hasMetaDesc = html.includes('name="description"');

  console.log(`[PAGE: ${file}] Canonical: ${hasCanonical}, og:url: ${hasOgUrl}, Twitter: ${hasTwitter}, Schema: ${hasLdJson}, MetaDesc: ${hasMetaDesc}`);
});
