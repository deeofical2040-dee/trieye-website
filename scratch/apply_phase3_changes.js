const fs = require('fs');
const path = require('path');

const serviceDefinitions = [
  {
    file: 'index.html',
    path: '/',
    name: 'TRIEYE Detailing Studio',
    isHome: true
  },
  {
    file: 'car-wash.html',
    path: '/car-wash',
    name: 'Car Wash',
    serviceType: 'Car Wash & Foam Cleaning Services',
    desc: 'Exterior snow foam wash, safe hand washing, wheel cleaning, tyre dressing and careful surface drying at TRIEYE Detailing Studio.'
  },
  {
    file: 'ceramic-coating.html',
    path: '/ceramic-coating',
    name: 'Ceramic Coating',
    serviceType: 'Ceramic Paint Protection Coating',
    desc: 'Ceramic coating application for cars and bikes in Chennai providing high gloss, hydrophobic water repellency, and durable paint protection.'
  },
  {
    file: 'graphene-coating.html',
    path: '/graphene-coating',
    name: 'Graphene Coating',
    serviceType: 'Graphene Nano Paint Shield',
    desc: 'Advanced nano-graphene coating for superior slickness, mirror shine, chemical resistance, and long-lasting vehicle paint protection.'
  },
  {
    file: 'paint-correction.html',
    path: '/paint-correction',
    name: 'Paint Correction',
    serviceType: 'Rotary Machine Paint Polishing & Swirl Removal',
    desc: 'Multi-stage machine polishing and paint restoration to eliminate swirl marks, light scratches, and oxidation while restoring paint clarity.'
  },
  {
    file: 'interior-detailing.html',
    path: '/interior-detailing',
    name: 'Interior Detailing',
    serviceType: 'Deep Cabin Steam Cleaning & Interior Restoration',
    desc: 'Comprehensive interior deep cleaning including steam sanitization, upholstery extraction, leather conditioning, and dashboard detailing.'
  },
  {
    file: 'ppf.html',
    path: '/ppf',
    name: 'Paint Protection Film (PPF)',
    serviceType: 'Paint Protection Film (PPF) Installation',
    desc: 'Self-healing TPU Paint Protection Film installation in Chennai for transparent shield against stone chips, scratches, and road debris.'
  },
  {
    file: 'bike-detailing.html',
    path: '/bike-detailing',
    name: 'Bike Detailing',
    serviceType: 'Motorcycle Cleaning & Detailing Services',
    desc: 'Specialized motorcycle deep cleaning, engine bay dressing, wheel care, tank polishing, and protective ceramic finishing for bikes.'
  }
];

// Master Business Entity JSON-LD Object
const masterBusinessEntity = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  "@id": "https://trieyedetailing.com/#business",
  "name": "TRIEYE Detailing Studio",
  "alternateName": "TRIEYE Car & Bike Detailing",
  "image": "https://trieyedetailing.com/assets/trieye-hero-car.jpg",
  "logo": "https://trieyedetailing.com/assets/trieye-logo-dark.png",
  "url": "https://trieyedetailing.com/",
  "telephone": "+919940181934",
  "priceRange": "₹₹",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Villivakkam",
    "addressLocality": "Chennai",
    "addressRegion": "Tamil Nadu",
    "postalCode": "600049",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 13.1077,
    "longitude": 80.2062
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "09:00",
      "closes": "20:00"
    }
  ]
};

// WebSite Entity JSON-LD for Homepage
const webSiteEntity = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://trieyedetailing.com/#website",
  "url": "https://trieyedetailing.com/",
  "name": "TRIEYE Detailing Studio",
  "publisher": {
    "@id": "https://trieyedetailing.com/#business"
  }
};

let totalLinksReplaced = 0;

// Step 1. Internal Link Cleanup Mapping
const internalLinkReplacements = [
  { from: /href=["']index\.html(["'])/g, to: 'href="/$1' },
  { from: /href=["']index\.html#([\w-]+)(["'])/g, to: 'href="/#$1$2' },
  { from: /href=["']car-wash\.html(["'])/g, to: 'href="/car-wash$1' },
  { from: /href=["']ceramic-coating\.html(["'])/g, to: 'href="/ceramic-coating$1' },
  { from: /href=["']graphene-coating\.html(["'])/g, to: 'href="/graphene-coating$1' },
  { from: /href=["']paint-correction\.html(["'])/g, to: 'href="/paint-correction$1' },
  { from: /href=["']interior-detailing\.html(["'])/g, to: 'href="/interior-detailing$1' },
  { from: /href=["']ppf\.html(["'])/g, to: 'href="/ppf$1' },
  { from: /href=["']bike-detailing\.html(["'])/g, to: 'href="/bike-detailing$1' },
  { from: /href=["']track-booking\.html(["'])/g, to: 'href="/track-booking$1' }
];

// Process all HTML files in project for link cleanup
const allHtmlFiles = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.endsWith('.html'));

allHtmlFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let html = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  internalLinkReplacements.forEach(r => {
    const matches = html.match(r.from);
    if (matches) {
      totalLinksReplaced += matches.length;
      html = html.replace(r.from, r.to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`Cleaned internal links in ${file}`);
  }
});

// Step 2. Standardize JSON-LD Schemas in Public Landing Pages
serviceDefinitions.forEach(s => {
  const filePath = path.join(__dirname, '..', s.file);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');

  // Extract existing FAQ JSON-LD script if present and valid
  let faqSchemaObj = null;
  const faqMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (faqMatch) {
    faqMatch.forEach(scriptTag => {
      const content = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      try {
        const parsed = JSON.parse(content);
        if (parsed['@type'] === 'FAQPage' || (Array.isArray(parsed) && parsed.some(item => item['@type'] === 'FAQPage'))) {
          faqSchemaObj = parsed['@type'] === 'FAQPage' ? parsed : parsed.find(item => item['@type'] === 'FAQPage');
        }
      } catch (e) {}
    });
  }

  // Remove ALL existing JSON-LD script blocks from the page head/body
  html = html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');

  // Build clean JSON-LD blocks for this route
  const schemasToInsert = [];

  if (s.isHome) {
    schemasToInsert.push(masterBusinessEntity);
    schemasToInsert.push(webSiteEntity);
  } else {
    // 1. Service Provider Business Ref Schema
    schemasToInsert.push(masterBusinessEntity);

    // 2. Service Schema
    schemasToInsert.push({
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `https://trieyedetailing.com${s.path}#service`,
      "name": s.name,
      "serviceType": s.serviceType,
      "description": s.desc,
      "url": `https://trieyedetailing.com${s.path}`,
      "provider": {
        "@id": "https://trieyedetailing.com/#business"
      },
      "areaServed": {
        "@type": "City",
        "name": "Chennai"
      }
    });

    // 3. BreadcrumbList Schema
    schemasToInsert.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `https://trieyedetailing.com${s.path}#breadcrumb`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://trieyedetailing.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": s.name,
          "item": `https://trieyedetailing.com${s.path}`
        }
      ]
    });

    // 4. Preserve matching FAQ Schema if present
    if (faqSchemaObj) {
      schemasToInsert.push(faqSchemaObj);
    }
  }

  // Generate clean <script type="application/ld+json"> tag
  const combinedSchemaScript = `\n  <script type="application/ld+json">\n${JSON.stringify(schemasToInsert, null, 2)}\n  </script>\n`;

  // Insert before </head>
  html = html.replace(/<\/head>/i, `${combinedSchemaScript}</head>`);

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`Updated Phase 3 JSON-LD schemas for ${s.file}`);
});

console.log(`\nPhase 3 Complete! Total internal .html links replaced: ${totalLinksReplaced}`);
