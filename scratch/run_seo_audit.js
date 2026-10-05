const fs = require('fs');
const path = require('path');

const pages = [
  'index.html',
  'car-wash.html',
  'ceramic-coating.html',
  'graphene-coating.html',
  'paint-correction.html',
  'interior-detailing.html',
  'ppf.html',
  'bike-detailing.html',
  'track-booking.html',
  'craftsmanship-demos.html',
  'dashboard.html',
  'invoice.html'
];

const auditResults = {};

pages.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) return;

  const html = fs.readFileSync(filePath, 'utf-8');

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Meta description
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) ||
                        html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : null;

  // Meta robots
  const metaRobotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([\s\S]*?)["']/i);
  const metaRobots = metaRobotsMatch ? metaRobotsMatch[1].trim() : null;

  // Canonical
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i) ||
                         html.match(/<link\s+href=["']([\s\S]*?)["']\s+rel=["']canonical["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

  // Viewport
  const viewportMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["']([\s\S]*?)["']/i);
  const viewport = viewportMatch ? viewportMatch[1].trim() : null;

  // Headings H1
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const h3Matches = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

  // Schema JSON-LD
  const schemaMatches = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemas = schemaMatches.map(m => {
    try {
      return JSON.parse(m[1].trim());
    } catch (e) {
      return { error: 'Invalid JSON', raw: m[1].trim() };
    }
  });

  // Open Graph
  const ogTitle = (html.match(/<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["']/i) || [])[1] || null;
  const ogDesc = (html.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']/i) || [])[1] || null;
  const ogImg = (html.match(/<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["']/i) || [])[1] || null;
  const ogUrl = (html.match(/<meta\s+property=["']og:url["']\s+content=["']([\s\S]*?)["']/i) || [])[1] || null;
  const ogType = (html.match(/<meta\s+property=["']og:type["']\s+content=["']([\s\S]*?)["']/i) || [])[1] || null;

  // Twitter
  const twCard = (html.match(/<meta\s+name=["']twitter:card["']\s+content=["']([\s\S]*?)["']/i) || [])[1] || null;

  // Images
  const imgMatches = [...html.matchAll(/<img\s+([^>]*?)>/gi)];
  let totalImgs = imgMatches.length;
  let missingAlt = 0;
  let emptyAlt = 0;
  let withAlt = 0;
  const altDetails = [];

  imgMatches.forEach(m => {
    const attrs = m[1];
    const srcMatch = attrs.match(/src=["']([\s\S]*?)["']/i);
    const altMatch = attrs.match(/alt=(["'])([\s\S]*?)\1/i);
    const src = srcMatch ? srcMatch[1] : 'unknown';

    if (!attrs.includes('alt=')) {
      missingAlt++;
      altDetails.push({ src, alt: null, type: 'MISSING' });
    } else if (!altMatch || altMatch[2].trim() === '') {
      emptyAlt++;
      altDetails.push({ src, alt: '', type: 'EMPTY' });
    } else {
      withAlt++;
      altDetails.push({ src, alt: altMatch[2].trim(), type: 'PRESENT' });
    }
  });

  // Internal Links
  const linkMatches = [...html.matchAll(/<a\s+[^>]*?href=["']([\s\S]*?)["']/gi)].map(m => m[1]);

  auditResults[file] = {
    title,
    metaDesc,
    metaRobots,
    canonical,
    viewport,
    h1s: h1Matches,
    h2Count: h2Matches.length,
    h3Count: h3Matches.length,
    schemas,
    og: { title: ogTitle, desc: ogDesc, img: ogImg, url: ogUrl, type: ogType },
    twitter: { card: twCard },
    imgStats: { total: totalImgs, withAlt, emptyAlt, missingAlt, altDetails },
    links: linkMatches
  };
});

fs.writeFileSync(path.join(__dirname, 'seo_audit_raw.json'), JSON.stringify(auditResults, null, 2));
console.log('SEO Audit Complete! Raw Data Saved.');
