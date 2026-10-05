import re, glob, os

CSS_PATH = '/Users/apple/Documents/Trieye /assets/service-page.css'
PUBLIC_PAGES = [
  'index.html',
  'car-wash.html',
  'ceramic-coating.html',
  'graphene-coating.html',
  'paint-correction.html',
  'interior-detailing.html',
  'ppf.html',
  'bike-detailing.html',
  'track-booking.html'
]
DIR_PATH = '/Users/apple/Documents/Trieye '

with open(CSS_PATH, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update/Add CSS Rules in assets/service-page.css
EXTRA_CSS_FIXES = """

/* ==================================================
   FINAL STRICT MOBILE & DESKTOP PARITY FIXES
   ================================================== */

/* 1. HAMBURGER MENU — DESKTOP VS MOBILE STRICT VISIBILITY */
@media (min-width: 1024px) {
  .burger,
  .burger-btn,
  .mobile-nav-toggle,
  .hamburger-toggle,
  #burgerBtn {
    display: none !important;
  }
  .nav-links {
    display: flex !important;
  }
  .nav-cta {
    display: inline-flex !important;
  }
}

@media (max-width: 1023px) {
  .nav-links {
    display: none !important;
  }
  .burger,
  .burger-btn,
  .mobile-nav-toggle,
  .hamburger-toggle,
  #burgerBtn {
    display: flex !important;
    align-items: center;
    justify-content: center;
  }
  .nav-cta {
    display: inline-flex !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
  }
}

/* Header Height & Centering */
header nav {
  min-height: 68px;
  max-height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}

/* 2. MOBILE HERO & WHITESPACE FIXES */
@media (max-width: 768px) {
  .hero {
    min-height: auto !important;
    padding: 24px 0 36px !important;
    background-position: center bottom !important;
    background-size: cover !important;
  }
  .hero-inner {
    padding: 12px 0 20px !important;
  }
  .hero-content {
    max-width: 100% !important;
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
  .hero-title {
    margin-top: 10px !important;
    margin-bottom: 14px !important;
    font-size: clamp(32px, 8vw, 42px) !important;
    line-height: 1.15 !important;
  }
  .hero-desc {
    font-size: 15px !important;
    margin-bottom: 20px !important;
  }
  /* Restore Hero Image Visibility on Mobile */
  .hero-bg-overlay {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.88) 0%,
      rgba(255, 255, 255, 0.70) 50%,
      rgba(255, 255, 255, 0.92) 100%
    ) !important;
  }
  [data-theme="dark"] .hero-bg-overlay {
    background: linear-gradient(
      180deg,
      rgba(15, 23, 42, 0.88) 0%,
      rgba(15, 23, 42, 0.70) 50%,
      rgba(15, 23, 42, 0.92) 100%
    ) !important;
  }
  /* Reduce mobile section padding to 48px–72px */
  section, .section {
    padding-top: clamp(40px, 8vw, 64px);
    padding-bottom: clamp(40px, 8vw, 64px);
  }
}

/* 3. MOBILE PRICING ALIGNMENT FIX (3-COLUMN FIXED GRID) */
@media (max-width: 768px) {
  .spec-row.head {
    display: none !important;
  }
  .spec-row {
    display: flex !important;
    flex-direction: column !important;
    border: 1px solid var(--line, #e2e8f0);
    border-radius: 10px;
    background: var(--bg-panel, #ffffff);
    margin-bottom: 16px;
    overflow: hidden;
  }
  .spec-row .cell.veh-cell {
    background: var(--bg-panel-2, #f8f9fa);
    padding: 14px 16px;
    font-size: 16px;
    font-weight: 700;
    border-bottom: 1px solid var(--line, #e2e8f0);
  }
  .spec-row .cell:not(.veh-cell) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 85px minmax(65px, auto) !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 12px 14px !important;
    border-bottom: 1px solid var(--line, #e2e8f0);
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .spec-row .cell:not(.veh-cell):last-child {
    border-bottom: none !important;
  }
  .spec-row .cell:not(.veh-cell)::before {
    content: attr(data-label);
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 600;
    text-align: left;
    white-space: normal;
    overflow-wrap: break-word;
  }
  .spec-row .cell:not(.veh-cell) .price {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px !important;
    font-weight: 700 !important;
    color: var(--pink, #ee2f76) !important;
    text-align: right !important;
    white-space: nowrap !important;
  }
  .spec-row .cell:not(.veh-cell) .price-lbl {
    font-size: 10px !important;
    color: var(--muted, #64748b) !important;
    text-transform: uppercase !important;
    text-align: right !important;
    white-space: nowrap !important;
  }
}

/* 4. GOOGLE REVIEWS CAROUSEL TOUCH & SCROLL FIX */
.reviews-slider {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  padding: 8px 4px 16px;
  width: 100%;
  box-sizing: border-box;
  scrollbar-width: none;
}
.reviews-slider .review-card-link {
  flex: 0 0 calc(33.333% - 14px);
  min-width: 300px;
  scroll-snap-align: start;
}
@media (max-width: 1024px) {
  .reviews-slider .review-card-link {
    flex: 0 0 calc(50% - 10px);
    min-width: 280px;
  }
}
@media (max-width: 640px) {
  .reviews-slider .review-card-link {
    flex: 0 0 88%;
    min-width: 260px;
  }
}
"""

if "FINAL STRICT MOBILE & DESKTOP PARITY FIXES" not in css:
    with open(CSS_PATH, 'a', encoding='utf-8') as f:
        f.write(EXTRA_CSS_FIXES)
    print("Appended final strict mobile CSS overrides to assets/service-page.css.")

# 2. Update Google Reviews Auto-Slide Script in index.html
ROBUST_REVIEWS_SCRIPT = """
<script>
  // Robust Google Reviews Auto-Slider & Touch Swipe Controller
  (function initReviewsAutoSlide() {
    const slider = document.getElementById('reviewsSlider');
    if (!slider) return;

    const cards = slider.querySelectorAll('.review-card-link');
    if (cards.length === 0) return;

    let currentIndex = 0;
    let autoTimer = null;
    const intervalTime = 4500; // 4.5s autoplay

    function getCardWidth() {
      const card = cards[0];
      return card ? card.offsetWidth + 20 : 320;
    }

    function scrollToCard(index) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      currentIndex = (index + cards.length) % cards.length;
      const targetCard = cards[currentIndex];
      if (targetCard) {
        const leftPos = targetCard.offsetLeft - slider.offsetLeft;
        slider.scrollTo({ left: leftPos, behavior: 'smooth' });
      }
    }

    function nextSlide() {
      scrollToCard(currentIndex + 1);
    }

    function startAutoSlide() {
      stopAutoSlide();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      autoTimer = setInterval(nextSlide, intervalTime);
    }

    function stopAutoSlide() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    window.slideReviews = function(dir) {
      stopAutoSlide();
      scrollToCard(currentIndex + dir);
      startAutoSlide();
    };

    // Update active index on user touch drag/scroll
    let scrollDebounce = null;
    slider.addEventListener('scroll', () => {
      if (scrollDebounce) clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(() => {
        const cardWidth = getCardWidth();
        const newIdx = Math.round(slider.scrollLeft / cardWidth);
        if (newIdx >= 0 && newIdx < cards.length) {
          currentIndex = newIdx;
        }
      }, 150);
    }, { passive: true });

    // Touch pause and resume
    slider.addEventListener('touchstart', stopAutoSlide, { passive: true });
    slider.addEventListener('touchend', () => {
      setTimeout(startAutoSlide, 2000);
    }, { passive: true });

    slider.parentElement.addEventListener('mouseenter', stopAutoSlide);
    slider.parentElement.addEventListener('mouseleave', startAutoSlide);

    startAutoSlide();
  })();
</script>
"""

with open('/Users/apple/Documents/Trieye /index.html', 'r', encoding='utf-8') as f:
    idx_html = f.read()

if 'initReviewsAutoSlide' in idx_html:
    idx_html = re.sub(r'<script>\s*// Smooth Google Reviews Slider Controller[\s\S]*?</script>', ROBUST_REVIEWS_SCRIPT.strip(), idx_html)
    with open('/Users/apple/Documents/Trieye /index.html', 'w', encoding='utf-8') as f:
        f.write(idx_html)
    print("Updated Google Reviews auto-slide script in index.html.")

