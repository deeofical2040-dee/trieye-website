const fs = require('fs');
const path = require('path');

const filesToOptimize = [
  'index.html',
  'car-wash.html',
  'ceramic-coating.html',
  'graphene-coating.html',
  'paint-correction.html',
  'interior-detailing.html',
  'ppf.html',
  'bike-detailing.html'
];

let totalImgsOptimized = 0;

filesToOptimize.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');

  // 1. Add Hero Image Preload to index.html <head> for LCP speed
  if (file === 'index.html' && !html.includes('rel="preload"')) {
    html = html.replace(/(<head[^>]*>)/i, `$1\n  <link rel="preload" href="assets/trieye-hero-car.jpg" as="image">`);
  }

  // 2. Ensure below-the-fold images have loading="lazy" and fetchpriority/dimensions where missing
  html = html.replace(/<img\s+([^>]*?)>/gi, (match, attrs) => {
    // Skip logos/hero elements from lazy loading
    if (attrs.includes('nav-logo') || attrs.includes('hero-img') || attrs.includes('hero')) {
      if (!attrs.includes('fetchpriority')) {
        return `<img ${attrs} fetchpriority="high">`;
      }
      return match;
    }
    
    let newAttrs = attrs;
    if (!attrs.includes('loading=')) {
      newAttrs += ' loading="lazy"';
      totalImgsOptimized++;
    }
    if (!attrs.includes('decoding=')) {
      newAttrs += ' decoding="async"';
    }
    return `<img ${newAttrs}>`;
  });

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`Optimized performance tags in ${file}`);
});

console.log(`Phase 4 Performance Optimization Complete! Total images tagged: ${totalImgsOptimized}`);
