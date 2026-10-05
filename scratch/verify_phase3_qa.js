const fs = require('fs');
const path = require('path');
const http = require('http');

const pages = [
  { route: '/', file: 'index.html', isHome: true },
  { route: '/car-wash', file: 'car-wash.html' },
  { route: '/ceramic-coating', file: 'ceramic-coating.html' },
  { route: '/graphene-coating', file: 'graphene-coating.html' },
  { route: '/paint-correction', file: 'paint-correction.html' },
  { route: '/interior-detailing', file: 'interior-detailing.html' },
  { route: '/ppf', file: 'ppf.html' },
  { route: '/bike-detailing', file: 'bike-detailing.html' }
];

const qaResults = [];

pages.forEach(p => {
  const filePath = path.join(__dirname, '..', p.file);
  const html = fs.readFileSync(filePath, 'utf-8');

  // 1. JSON-LD Verification
  let jsonValid = true;
  let hasLocalBusiness = false;
  let hasService = false;
  let hasFAQ = false;
  let hasBreadcrumb = false;

  const jsonMatches = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  jsonMatches.forEach(m => {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach(item => {
        if (item['@type'] === 'AutoRepair' || item['@type'] === 'LocalBusiness' || item['@id'] === 'https://trieyedetailing.com/#business') {
          hasLocalBusiness = true;
        }
        if (item['@type'] === 'Service') {
          hasService = true;
        }
        if (item['@type'] === 'FAQPage') {
          hasFAQ = true;
        }
        if (item['@type'] === 'BreadcrumbList') {
          hasBreadcrumb = true;
        }
      });
    } catch (e) {
      jsonValid = false;
    }
  });

  // 2. Check for leftover internal .html links in public navigation
  const htmlLinkMatches = [...html.matchAll(/href=["'](car-wash|ceramic-coating|graphene-coating|paint-correction|interior-detailing|ppf|bike-detailing)\.html/g)];

  qaResults.push({
    route: p.route,
    jsonValid,
    localBusiness: hasLocalBusiness ? 'STANDARDIZED (@id)' : 'MISSING',
    service: p.isHome ? 'N/A' : (hasService ? 'PRESENT' : 'MISSING'),
    faqPage: hasFAQ ? 'PRESENT' : 'NONE',
    breadcrumb: p.isHome ? 'N/A' : (hasBreadcrumb ? 'PRESENT' : 'MISSING'),
    internalUrlsClean: htmlLinkMatches.length === 0,
    result: (jsonValid && hasLocalBusiness && (p.isHome || (hasService && hasBreadcrumb)) && htmlLinkMatches.length === 0) ? '✅ PASS' : '❌ FAIL'
  });
});

console.log(JSON.stringify(qaResults, null, 2));
