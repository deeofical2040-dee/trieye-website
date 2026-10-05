const http = require('http');
const fs = require('fs');
const path = require('path');

const publicPages = [
  { path: '/', file: 'index.html' },
  { path: '/car-wash', file: 'car-wash.html' },
  { path: '/ceramic-coating', file: 'ceramic-coating.html' },
  { path: '/graphene-coating', file: 'graphene-coating.html' },
  { path: '/paint-correction', file: 'paint-correction.html' },
  { path: '/interior-detailing', file: 'interior-detailing.html' },
  { path: '/ppf', file: 'ppf.html' },
  { path: '/bike-detailing', file: 'bike-detailing.html' }
];

const results = [];

publicPages.forEach(p => {
  const filePath = path.join(__dirname, '..', p.file);
  const html = fs.readFileSync(filePath, 'utf-8');

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
  const desc = descMatch ? descMatch[1].trim() : null;

  const canMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i);
  const canonical = canMatch ? canMatch[1].trim() : null;

  const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([\s\S]*?)["']/i);
  const ogUrl = ogUrlMatch ? ogUrlMatch[1].trim() : null;

  const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["']/i);
  const ogImage = ogImgMatch ? ogImgMatch[1].trim() : null;

  const twCardMatch = html.match(/<meta\s+name=["']twitter:card["']\s+content=["']([\s\S]*?)["']/i);
  const twitterCard = twCardMatch ? twCardMatch[1].trim() : null;

  results.push({
    route: p.path,
    title,
    titleLen: title ? title.length : 0,
    desc,
    descLen: desc ? desc.length : 0,
    canonical,
    ogUrl,
    ogImage,
    twitterCard,
    ogUrlMatchesCanonical: ogUrl === canonical
  });
});

console.log(JSON.stringify(results, null, 2));
