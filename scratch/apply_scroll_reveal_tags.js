const fs = require('fs');
const path = require('path');

const targetPages = [
  'index.html',
  'car-wash.html',
  'ceramic-coating.html',
  'graphene-coating.html',
  'paint-correction.html',
  'interior-detailing.html',
  'ppf.html',
  'bike-detailing.html',
  'track-booking.html'
];

targetPages.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');

  // Add scroll-reveal.js before </body> if not present
  if (!html.includes('assets/scroll-reveal.js')) {
    html = html.replace(/<\/body>/i, `  <script src="assets/scroll-reveal.js" defer></script>\n</body>`);
  }

  // Tag major section containers, headers, grids, cards, images, FAQs, reviews, footer
  // 1. Section headers
  html = html.replace(/class=["'](sec-head|sec-header|section-header)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](sec-title|section-title)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](sec-desc|section-desc)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](sec-tag|sec-label|tag-pill|sec-pill)["']/gi, 'class="$1 reveal-element"');

  // 2. Grids & Card Containers with Stagger
  html = html.replace(/class=["'](explore-services-grid|services-grid|process-grid|features-grid|grid-3|grid-2|grid-4)["']/gi, 'class="$1 reveal-stagger"');
  html = html.replace(/class=["'](explore-card|service-card|process-card|spec-card|veh-card|pkg-card|feature-card)["']/gi, 'class="$1 reveal-element"');

  // 3. Section Containers (FAQ, Reviews, About, Contact, Pricing, Footer)
  html = html.replace(/class=["'](reviews-section|sec-reviews|reviews-container|google-reviews-section)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](faq-section|sec-faq|faq-container)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](about-section|sec-about|intro-section|split-intro)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](contact-section|sec-contact|location-section)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](pricing-section|sec-pricing|specs-section)["']/gi, 'class="$1 reveal-element"');
  html = html.replace(/class=["'](footer-col|footer-brand|footer-links|footer-bottom)["']/gi, 'class="$1 reveal-element"');

  // 4. Detailing Images in intro/split sections
  html = html.replace(/class=["'](intro-img|split-img|detail-img|hero-detail-img)["']/gi, 'class="$1 reveal-element reveal-img"');

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`Tagged scroll-reveal elements in ${file}`);
});
