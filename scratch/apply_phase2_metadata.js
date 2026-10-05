const fs = require('fs');
const path = require('path');

const pageMetadata = [
  {
    file: 'index.html',
    title: 'TRIEYE Detailing Studio | Car & Bike Detailing in Chennai',
    desc: 'Premium car and bike detailing in Villivakkam, Chennai. Explore car wash, ceramic coating, PPF, paint correction and detailing at TRIEYE.',
    canonicalUrl: 'https://trieyedetailing.com/',
    ogImage: 'assets/trieye-hero-car.jpg'
  },
  {
    file: 'car-wash.html',
    title: 'Car Wash in Chennai | Foam Wash | TRIEYE Detailing Studio',
    desc: 'Professional car wash in Villivakkam, Chennai with snow foam, safe hand washing, wheel cleaning and careful drying at TRIEYE Detailing Studio.',
    canonicalUrl: 'https://trieyedetailing.com/car-wash',
    ogImage: 'assets/foam-wash.jpg'
  },
  {
    file: 'ceramic-coating.html',
    title: 'Ceramic Coating in Chennai | TRIEYE Detailing Studio',
    desc: 'Ceramic coating in Chennai for enhanced gloss, hydrophobic performance and paint protection. Professional application at TRIEYE in Villivakkam.',
    canonicalUrl: 'https://trieyedetailing.com/ceramic-coating',
    ogImage: 'assets/ceramic-coating/hydrophobic-water-beading.webp'
  },
  {
    file: 'graphene-coating.html',
    title: 'Graphene Coating in Chennai | TRIEYE Detailing Studio',
    desc: 'Graphene coating in Chennai for slickness, gloss and hydrophobic paint protection. Professionally applied at TRIEYE Detailing Studio, Villivakkam.',
    canonicalUrl: 'https://trieyedetailing.com/graphene-coating',
    ogImage: 'assets/graphene/graphene-application.jpg'
  },
  {
    file: 'paint-correction.html',
    title: 'Paint Correction in Chennai | TRIEYE Detailing Studio',
    desc: 'Professional paint correction in Chennai to reduce swirl marks and improve paint clarity and gloss. Visit TRIEYE Detailing Studio in Villivakkam.',
    canonicalUrl: 'https://trieyedetailing.com/paint-correction',
    ogImage: 'assets/rubbing-polish.jpg'
  },
  {
    file: 'interior-detailing.html',
    title: 'Car Interior Cleaning in Chennai | TRIEYE Detailing Studio',
    desc: 'Interior car detailing in Chennai with deep cleaning for seats, carpets, mats and cabin surfaces at TRIEYE Detailing Studio, Villivakkam.',
    canonicalUrl: 'https://trieyedetailing.com/interior-detailing',
    ogImage: 'assets/interior-clean.jpg'
  },
  {
    file: 'ppf.html',
    title: 'PPF in Chennai | Paint Protection Film | TRIEYE Detailing Studio',
    desc: 'Paint Protection Film (PPF) in Chennai for transparent protection against everyday paint damage. Professional PPF installation at TRIEYE, Villivakkam.',
    canonicalUrl: 'https://trieyedetailing.com/ppf',
    ogImage: 'assets/ppf/ppf-installation.jpg'
  },
  {
    file: 'bike-detailing.html',
    title: 'Bike Detailing in Chennai | TRIEYE Detailing Studio',
    desc: 'Professional bike detailing in Chennai with deep cleaning and careful finishing for motorcycles at TRIEYE Detailing Studio in Villivakkam.',
    canonicalUrl: 'https://trieyedetailing.com/bike-detailing',
    ogImage: 'assets/bike/bike-hero.jpg'
  }
];

pageMetadata.forEach(p => {
  const filePath = path.join(__dirname, '..', p.file);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');

  // 1. Update Title Tag if ppf.html or missing
  if (p.file === 'ppf.html') {
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${p.title}</title>`);
  }

  // 2. Meta description
  html = html.replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '');
  
  // 3. Open Graph Tags
  html = html.replace(/<meta\s+property=["']og:title["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property=["']og:description["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property=["']og:url["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property=["']og:type["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property=["']og:image["'][^>]*>\s*/gi, '');

  // 4. Twitter Tags
  html = html.replace(/<meta\s+name=["']twitter:card["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:title["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:description["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:image["'][^>]*>\s*/gi, '');

  // Construct meta block
  const fullMetaBlock = `
  <meta name="description" content="${p.desc}">

  <!-- Open Graph / Social Meta -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${p.title}">
  <meta property="og:description" content="${p.desc}">
  <meta property="og:url" content="${p.canonicalUrl}">
  <meta property="og:image" content="${p.ogImage}">

  <!-- Twitter Card Meta -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${p.title}">
  <meta name="twitter:description" content="${p.desc}">
  <meta name="twitter:image" content="${p.ogImage}">`;

  // Insert block right after the canonical tag
  if (html.includes('rel="canonical"')) {
    html = html.replace(/(<link\s+rel=["']canonical["'][^>]*>)/i, `$1${fullMetaBlock}`);
  } else if (html.includes('name="viewport"')) {
    html = html.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, `$1${fullMetaBlock}`);
  }

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`Updated Phase 2 metadata for ${p.file}`);
});
