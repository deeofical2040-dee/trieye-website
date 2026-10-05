import os, re

CSS_PATH = '/Users/apple/Documents/Trieye /assets/service-page.css'
INTERIOR_HTML_PATH = '/Users/apple/Documents/Trieye /interior-detailing.html'

# 1. Add CSS rules to service-page.css for mobile split-grid and intro section vertical ordering
with open(CSS_PATH, 'r', encoding='utf-8') as f:
    css = f.read()

INTRO_STACK_CSS = """
/* ==================================================
   MOBILE SPLIT-GRID & INTRO SECTION VERTICAL STACK
   ================================================== */
@media (min-width: 769px) {
  .intro-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 40px !important;
    align-items: center !important;
  }
  .intro-header {
    grid-column: 1;
    grid-row: 1;
  }
  .intro-body {
    grid-column: 1;
    grid-row: 2;
  }
  .intro-media {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}

@media (max-width: 768px) {
  .split-grid,
  .intro-grid {
    display: flex !important;
    flex-direction: column !important;
    grid-template-columns: 1fr !important;
    width: 100% !important;
    gap: 16px !important;
    padding-left: 18px !important;
    padding-right: 18px !important;
    box-sizing: border-box !important;
  }

  .intro-header {
    width: 100% !important;
    margin-bottom: 4px !important;
    order: 1 !important;
  }

  .intro-header h2,
  .split-grid h2 {
    font-size: clamp(26px, 7.5vw, 36px) !important;
    line-height: 1.2 !important;
    margin-bottom: 12px !important;
    overflow-wrap: break-word !important;
    word-break: break-word !important;
  }

  .intro-media {
    width: 100% !important;
    max-width: 100% !important;
    margin-bottom: 16px !important;
    order: 2 !important;
    float: none !important;
    position: static !important;
  }

  .intro-media img,
  .intro-img,
  .split-grid img {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    aspect-ratio: 16 / 10 !important;
    object-fit: cover !important;
    border-radius: 12px !important;
    display: block !important;
    float: none !important;
    position: static !important;
    margin: 0 !important;
  }

  .intro-body {
    width: 100% !important;
    max-width: 100% !important;
    order: 3 !important;
    box-sizing: border-box !important;
  }

  .intro-body p,
  .split-grid p {
    width: 100% !important;
    max-width: none !important;
    font-size: 16px !important;
    line-height: 1.65 !important;
    margin-bottom: 16px !important;
    overflow-wrap: break-word !important;
    word-break: break-word !important;
  }

  /* Prevent side-by-side splitting on any split-grid div children */
  .split-grid > div {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
}
"""

if "MOBILE SPLIT-GRID & INTRO SECTION VERTICAL STACK" not in css:
    css += INTRO_STACK_CSS

with open(CSS_PATH, 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated assets/service-page.css with mobile intro stack CSS.")

# 2. Update intro section in interior-detailing.html
with open(INTERIOR_HTML_PATH, 'r', encoding='utf-8') as f:
    html = f.read()

OLD_INTRO_BLOCK = r'<section id="intro"[\s\S]*?</section>'
NEW_INTRO_BLOCK = """<section id="intro" style="padding: 50px 0; background-color: #fff;">
  <div class="wrap intro-grid split-grid" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <div class="intro-header">
      <div class="sec-tag" style="color: var(--pink); font-size: 14px; font-weight: 600; letter-spacing: 2px; margin-bottom: 16px; font-family: 'IBM Plex Mono', monospace;">DEEP INTERIOR CARE</div>
      <h2 style="font-size: 40px; font-weight: 800; line-height: 1.2; margin-bottom: 24px; text-transform: uppercase; color: #111;">MORE THAN A QUICK VACUUM</h2>
    </div>
    <div class="intro-media">
      <img src="assets/interior-detailing/interior-deep-cleaning.webp" alt="Professional car interior deep cleaning" class="intro-img" style="width: 100%; border-radius: 12px; object-fit: cover; aspect-ratio: 16/10; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" loading="lazy" decoding="async">
    </div>
    <div class="intro-body">
      <p style="color: #444; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        Our interior deep cleaning focuses on the detailed cleaning of commonly used cabin areas and surfaces. Over time, dirt, dust, and daily wear accumulate inside your car, dulling the appearance of your upholstery and plastics.
      </p>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">
        At TRIEYE Detailing Studio in Villivakkam, Chennai, we take a thorough approach to refresh your seats, carpets, floor mats, dashboard, centre console, door panels, and other accessible cabin surfaces.
      </p>
    </div>
  </div>
</section>"""

html_fixed = re.sub(OLD_INTRO_BLOCK, NEW_INTRO_BLOCK, html, count=1)

with open(INTERIOR_HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html_fixed)

print("Updated interior-detailing.html intro section.")
