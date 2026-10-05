const fs = require('fs');
const path = require('path');

const updates = [
  {
    file: 'index.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/">'
  },
  {
    file: 'car-wash.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/car-wash">'
  },
  {
    file: 'ceramic-coating.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/ceramic-coating">'
  },
  {
    file: 'graphene-coating.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/graphene-coating">'
  },
  {
    file: 'paint-correction.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/paint-correction">'
  },
  {
    file: 'interior-detailing.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/interior-detailing">'
  },
  {
    file: 'ppf.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/ppf">'
  },
  {
    file: 'bike-detailing.html',
    canonical: '<link rel="canonical" href="https://trieyedetailing.com/bike-detailing">'
  },
  {
    file: 'track-booking.html',
    robots: '<meta name="robots" content="noindex, follow">'
  },
  {
    file: 'dashboard.html',
    robots: '<meta name="robots" content="noindex, nofollow">'
  },
  {
    file: 'invoice.html',
    robots: '<meta name="robots" content="noindex, nofollow">'
  },
  {
    file: 'craftsmanship-demos.html',
    robots: '<meta name="robots" content="noindex, nofollow">'
  }
];

updates.forEach(u => {
  const filePath = path.join(__dirname, '..', u.file);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');

  // Check if canonical needs inserting
  if (u.canonical) {
    // Remove any existing canonical first to prevent duplicates
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
    
    // Insert after meta viewport or meta description
    if (html.includes('name="viewport"')) {
      html = html.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, `$1\n  ${u.canonical}`);
    } else {
      html = html.replace(/(<head[^>]*>)/i, `$1\n  ${u.canonical}`);
    }
  }

  // Check if meta robots needs inserting
  if (u.robots) {
    // Remove any existing robots tag
    html = html.replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, '');

    if (html.includes('name="viewport"')) {
      html = html.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, `$1\n  ${u.robots}`);
    } else {
      html = html.replace(/(<head[^>]*>)/i, `$1\n  ${u.robots}`);
    }
  }

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`Updated ${u.file} with Phase 1 SEO meta/canonical tags.`);
});
