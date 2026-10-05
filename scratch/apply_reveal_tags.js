const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const pages = [
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

pages.forEach(page => {
  const filePath = path.join(__dirname, '..', page);
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  // 1. Link scroll-reveal.js if not present
  if ($('script[src*="scroll-reveal.js"]').length === 0) {
    $('body').append('  <script src="assets/scroll-reveal.js" defer></script>\n');
  }

  // 2. Process sections excluding hero section (.hero, .hero-section, #hero)
  $('section, div.section-wrapper').each((i, sec) => {
    const $sec = $(sec);
    if ($sec.hasClass('hero') || $sec.hasClass('hero-section') || $sec.attr('id') === 'hero') {
      return; // Skip Hero completely
    }

    // A. Text reveal elements
    $sec.find('.sec-tag, .section-tag, .tag, .badge, .sub-title').each((_, el) => {
      $(el).addClass('reveal-text');
    });
    $sec.find('.sec-title, .section-title, h2, .heading-main').each((_, el) => {
      const $el = $(el);
      // do not re-tag inside cards if card is already staggered
      if (!$el.parents('.card, .service-card, .process-card, .price-card').length) {
        $el.addClass('reveal-text');
      }
    });
    $sec.find('.sec-desc, .section-desc, .lead-text, .intro-text').each((_, el) => {
      const $el = $(el);
      if (!$el.parents('.card, .service-card, .process-card, .price-card').length) {
        $el.addClass('reveal-text');
      }
    });

    // B. Split Grid Directional Image Reveals
    // Find split grids / intro grids / 2-column layouts
    const $grid = $sec.find('.split-grid, .intro-grid, .about-grid, .hero-split, .grid-2-col, .two-col');
    if ($grid.length) {
      $grid.each((_, gr) => {
        const children = $(gr).children().toArray();
        if (children.length === 2) {
          const col1 = $(children[0]);
          const col2 = $(children[1]);

          // Check if col1 is image container or contains img
          const col1HasImg = col1.is('img') || col1.find('img').length > 0 || col1.hasClass('img-box') || col1.hasClass('media-col');
          const col2HasImg = col2.is('img') || col2.find('img').length > 0 || col2.hasClass('img-box') || col2.hasClass('media-col');

          if (col1HasImg && !col2HasImg) {
            // Image is on LEFT (column 1) -> reveal-left
            col1.addClass('reveal-left');
          } else if (col2HasImg && !col1HasImg) {
            // Image is on RIGHT (column 2) -> reveal-right
            col2.addClass('reveal-right');
          }
        }
      });
    }

    // C. Cards container / Stagger reveal
    $sec.find('.cards-grid, .services-grid, .process-grid, .pricing-grid, .specs-grid, .explore-services-grid').each((_, cardGrid) => {
      const $cg = $(cardGrid);
      $cg.children().each((idx, card) => {
        $(card).addClass('reveal-card');
      });
    });

    // D. Full width standalone images or feature images
    $sec.find('img.full-width-img, .banner-img, .cta-bg-image').each((_, img) => {
      $(img).addClass('reveal-up');
    });

    // E. FAQ section container reveal
    if ($sec.hasClass('faq-section') || $sec.find('.faq-container, .accordion').length) {
      $sec.find('.faq-container, .accordion, .faq-list').addClass('reveal-up');
    }

    // F. Google Reviews section reveal (whole section once)
    if ($sec.hasClass('reviews-section') || $sec.find('.reviews-carousel, .google-reviews').length) {
      $sec.find('.reviews-carousel, .reviews-container').addClass('reveal-up');
    }
  });

  fs.writeFileSync(filePath, $.html(), 'utf8');
  console.log(`Updated reveal tags for ${page}`);
});
