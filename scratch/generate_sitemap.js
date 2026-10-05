const fs = require('fs');
const path = require('path');

const urls = [
  { loc: 'https://trieyedetailing.com/', file: 'index.html', priority: '1.0' },
  { loc: 'https://trieyedetailing.com/car-wash', file: 'car-wash.html', priority: '0.8' },
  { loc: 'https://trieyedetailing.com/ceramic-coating', file: 'ceramic-coating.html', priority: '0.9' },
  { loc: 'https://trieyedetailing.com/graphene-coating', file: 'graphene-coating.html', priority: '0.9' },
  { loc: 'https://trieyedetailing.com/paint-correction', file: 'paint-correction.html', priority: '0.9' },
  { loc: 'https://trieyedetailing.com/interior-detailing', file: 'interior-detailing.html', priority: '0.8' },
  { loc: 'https://trieyedetailing.com/ppf', file: 'ppf.html', priority: '0.9' },
  { loc: 'https://trieyedetailing.com/bike-detailing', file: 'bike-detailing.html', priority: '0.8' }
];

let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemapContent += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

urls.forEach(u => {
  const filePath = path.join(__dirname, '..', u.file);
  const stat = fs.statSync(filePath);
  const mtime = stat.mtime.toISOString().split('T')[0];

  sitemapContent += `  <url>\n`;
  sitemapContent += `    <loc>${u.loc}</loc>\n`;
  sitemapContent += `    <lastmod>${mtime}</lastmod>\n`;
  sitemapContent += `    <changefreq>weekly</changefreq>\n`;
  sitemapContent += `    <priority>${u.priority}</priority>\n`;
  sitemapContent += `  </url>\n`;
});

sitemapContent += `</urlset>\n`;

fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), sitemapContent, 'utf-8');
console.log('sitemap.xml generated with real file modification dates!');
