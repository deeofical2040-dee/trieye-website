const http = require('http');
const fs = require('fs');
const path = require('path');

const sitemapXml = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf-8');

const testRoutes = [
  { path: '/', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/', file: 'index.html' },
  { path: '/car-wash', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/car-wash', file: 'car-wash.html' },
  { path: '/ceramic-coating', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/ceramic-coating', file: 'ceramic-coating.html' },
  { path: '/graphene-coating', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/graphene-coating', file: 'graphene-coating.html' },
  { path: '/paint-correction', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/paint-correction', file: 'paint-correction.html' },
  { path: '/interior-detailing', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/interior-detailing', file: 'interior-detailing.html' },
  { path: '/ppf', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/ppf', file: 'ppf.html' },
  { path: '/bike-detailing', expectedStatus: 200, isPublic: true, sitemapUrl: 'https://trieyedetailing.com/bike-detailing', file: 'bike-detailing.html' },
  { path: '/track-booking', expectedStatus: 200, isPublic: false, file: 'track-booking.html' },
  { path: '/dashboard', expectedStatus: 200, isPublic: false, file: 'dashboard.html' },
  { path: '/invoice', expectedStatus: 200, isPublic: false, file: 'invoice.html' },
  { path: '/craftsmanship-demos', expectedStatus: 200, isPublic: false, file: 'craftsmanship-demos.html' },
  { path: '/robots.txt', expectedStatus: 200 },
  { path: '/sitemap.xml', expectedStatus: 200 },
  { path: '/non-existent-route-check-404', expectedStatus: 404 }
];

async function checkRoute(r) {
  return new Promise(resolve => {
    http.get(`http://localhost:3000${r.path}`, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let canonical = 'N/A';
        let robots = 'NONE';
        let inSitemap = false;

        if (r.file) {
          const content = fs.readFileSync(path.join(__dirname, '..', r.file), 'utf-8');
          const canMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i);
          if (canMatch) canonical = canMatch[1];

          const robMatch = content.match(/<meta\s+name=["']robots["']\s+content=["']([\s\S]*?)["']/i);
          if (robMatch) robots = robMatch[1];

          if (r.sitemapUrl && sitemapXml.includes(`<loc>${r.sitemapUrl}</loc>`)) {
            inSitemap = true;
          }
        }

        resolve({
          path: r.path,
          status: res.statusCode,
          statusOk: res.statusCode === r.expectedStatus,
          canonical,
          robots,
          inSitemap,
          isPublic: r.isPublic
        });
      });
    }).on('error', err => {
      resolve({ path: r.path, status: 'ERR', error: err.message });
    });
  });
}

(async () => {
  const results = [];
  for (const r of testRoutes) {
    results.push(await checkRoute(r));
  }
  console.log(JSON.stringify(results, null, 2));
})();
