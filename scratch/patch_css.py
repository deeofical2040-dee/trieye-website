import os, re, glob

CSS_PATH = '/Users/apple/Documents/Trieye /assets/service-page.css'

with open(CSS_PATH, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Additional CSS rules to append/ensure for complete mobile responsiveness across all pages
NEW_RESPONSIVE_CSS = """

/* ==================================================
   RESPONSIVE AUDIT ENHANCEMENTS & COMPONENT FIXES
   ================================================== */

/* 1. Global Container & Text Wrap Protection */
html, body {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: border-box;
}

.wrap, .container, .footer-wrap {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: clamp(16px, 4vw, 28px);
  padding-right: clamp(16px, 4vw, 28px);
  box-sizing: border-box;
}

h1, .hero-title {
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  font-size: clamp(2rem, 7.5vw, 3.8rem);
  line-height: 1.1;
  letter-spacing: 0.01em;
  overflow-wrap: break-word;
  word-break: break-word;
}

h2, .sec-title {
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  font-size: clamp(1.6rem, 5.5vw, 2.6rem);
  line-height: 1.15;
  overflow-wrap: break-word;
  word-break: break-word;
}

h3 {
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  font-size: clamp(1.2rem, 4vw, 1.8rem);
  overflow-wrap: break-word;
  word-break: break-word;
}

p {
  overflow-wrap: break-word;
  word-break: break-word;
}

img, svg, video {
  max-width: 100%;
  height: auto;
}

/* 2. Mobile Header & Touch Targets */
.mobile-nav-toggle,
.hamburger-toggle,
#burgerBtn {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.mobile-drawer-close,
#mobileDrawerClose {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  line-height: 1;
  background: transparent;
  border: none;
  color: var(--white);
  cursor: pointer;
  padding: 8px;
}

/* Mobile Navigation Drawer */
.mobile-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 399;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.mobile-drawer-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

.mobile-nav-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: min(340px, 85vw);
  background: var(--bg-panel, #ffffff);
  border-left: 1px solid var(--line, #e2e8f0);
  z-index: 400;
  padding: 20px 20px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
  overflow-y: auto;
}

.mobile-nav-drawer.open {
  transform: translateX(0);
}

.mobile-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line, #e2e8f0);
  margin-bottom: 20px;
}

.mobile-drawer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-drawer-links li a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  font-family: 'Oswald', sans-serif;
  font-size: 18px;
  text-transform: uppercase;
  color: var(--white, #111827);
  min-height: 44px;
  text-decoration: none;
  transition: color 0.2s ease;
}

.mobile-drawer-links li a:hover {
  color: var(--pink, #ee2f76);
}

.mobile-drawer-accordion {
  width: 100%;
}

.mobile-accordion-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  padding: 12px 0;
  font-family: 'Oswald', sans-serif;
  font-size: 18px;
  text-transform: uppercase;
  color: var(--white, #111827);
  cursor: pointer;
  min-height: 44px;
  text-align: left;
}

.mobile-accordion-icon {
  font-size: 20px;
  font-weight: 700;
  color: var(--pink, #ee2f76);
  transition: transform 0.2s ease;
}

.mobile-accordion-content {
  display: none;
  list-style: none;
  padding: 4px 0 8px 16px;
  margin: 0;
  border-left: 2px solid var(--pink, #ee2f76);
}

.mobile-drawer-accordion.open .mobile-accordion-content,
.mobile-accordion-btn[aria-expanded="true"] + .mobile-accordion-content {
  display: block;
}

.mobile-accordion-content li {
  margin-bottom: 4px;
}

.mobile-accordion-content a.m-sublink {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--muted, #64748b);
  padding: 8px 0;
  min-height: 44px;
  display: block;
  text-decoration: none;
}

.mobile-accordion-content a.m-sublink:hover {
  color: var(--pink, #ee2f76);
}

.mobile-drawer-book-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  min-height: 48px;
  background: var(--green, #a6d331);
  color: #000000 !important;
  font-family: 'Oswald', sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 20px;
  box-shadow: 0 4px 14px rgba(166, 211, 49, 0.3);
}

/* 3. Hero Sections Stack on Mobile */
@media (max-width: 768px) {
  .hero-container,
  .hero-content,
  .hero-split {
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 36px 0 28px;
    gap: 20px;
  }
  .hero-actions,
  .hero-ctas {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  .hero-actions .btn,
  .hero-ctas .btn {
    width: 100%;
    min-height: 48px;
    justify-content: center;
  }
}

/* 4. Homepage Service Navigator (7 Core Service Cards) */
.explore-services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 32px;
}

.explore-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none !important;
  color: inherit !important;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  width: 100%;
}

.explore-card:hover {
  transform: translateY(-4px);
  border-color: var(--pink, #ee2f76);
  box-shadow: 0 12px 30px rgba(238, 47, 118, 0.15);
}

.explore-card-img-wrap {
  position: relative;
  width: 100%;
  height: 210px;
  overflow: hidden;
  background: #111;
}

.explore-card-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.4s ease;
}

.explore-card:hover .explore-card-img-wrap img {
  transform: scale(1.05);
}

.explore-card-num {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: var(--pink, #ee2f76);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  z-index: 2;
  border: 1px solid rgba(238, 47, 118, 0.3);
}

.explore-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
}

.explore-card-title {
  font-family: 'Oswald', sans-serif;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--white, #111827);
  margin-bottom: 8px;
}

.explore-card-desc {
  font-size: 14px;
  color: var(--muted, #64748b);
  line-height: 1.5;
  margin-bottom: 16px;
}

.explore-card-btn {
  font-family: 'Oswald', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pink, #ee2f76);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  min-height: 44px;
}

@media (max-width: 1024px) {
  .explore-services-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .explore-services-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .explore-card-img-wrap {
    height: 190px;
  }
}

/* 5. Service Page Multi-Column Card Grids */
@media (max-width: 640px) {
  .areas-grid,
  .steps-grid,
  .features-grid,
  .cards-grid,
  .process-grid,
  .pricing-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
}

/* 6. Touch Before/After Comparison Sliders */
.comparison-slider,
.before-after-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 16/9;
  max-height: 450px;
  border-radius: 12px;
  touch-action: pan-y;
  user-select: none;
}

.comparison-handle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--pink, #ee2f76);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: ew-resize;
  z-index: 10;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

/* 7. Gallery Grids */
@media (max-width: 480px) {
  .gallery-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
}
@media (min-width: 481px) and (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
}

/* 8. FAQ Accordion Mobile Layout & Tap Target */
.faq-question {
  width: 100%;
  min-height: 48px;
  padding: 14px 16px;
  font-family: 'Oswald', sans-serif;
  font-size: 16px;
  text-transform: uppercase;
  color: var(--white, #111827);
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
  gap: 12px;
}

.faq-answer-wrapper {
  padding: 0 16px 16px;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--muted, #64748b);
}

/* 9. Booking Form Mobile Controls */
@media (max-width: 768px) {
  input[type="text"],
  input[type="tel"],
  input[type="email"],
  input[type="date"],
  select,
  textarea {
    font-size: 16px !important; /* Prevents iOS zoom */
    min-height: 48px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .booking-form .btn-primary,
  .booking-form button[type="submit"] {
    width: 100% !important;
    min-height: 52px !important;
    font-size: 16px !important;
  }
}

/* 10. Booking Confirmation Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.modal-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

.modal-box {
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 12px;
  width: calc(100% - 24px);
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: clamp(20px, 4vw, 32px);
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  transform: translateY(20px);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin: auto;
}

.modal-backdrop.open .modal-box {
  transform: translateY(0);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted, #64748b);
  font-size: 26px;
  cursor: pointer;
  line-height: 1;
  padding: 8px;
}

.modal-close:hover {
  color: var(--white, #111827);
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 16px;
}

.modal-actions .btn,
.modal-actions a {
  width: 100% !important;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
}

/* 11. Global Footer Standardized Styling */
.site-footer {
  background: var(--bg-panel-2, #f8f9fa);
  border-top: 1px solid var(--line, #e2e8f0);
  padding: 56px 0 28px;
  color: var(--white, #111827);
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-col {
  display: flex;
  flex-direction: column;
}

.footer-logo {
  height: 32px;
  width: auto;
  margin-bottom: 16px;
}

.footer-desc {
  font-size: 14px;
  color: var(--muted, #64748b);
  line-height: 1.6;
  margin-bottom: 20px;
}

.footer-socials {
  display: flex;
  align-items: center;
  gap: 12px;
}

.social-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--line, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--white, #111827);
  transition: all 0.2s ease;
  text-decoration: none;
}

.social-icon:hover {
  border-color: var(--pink, #ee2f76);
  color: var(--pink, #ee2f76);
  transform: translateY(-2px);
}

.footer-heading {
  font-family: 'Oswald', sans-serif;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--white, #111827);
  margin-bottom: 16px;
  letter-spacing: 0.05em;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-links a {
  font-size: 14px;
  color: var(--muted, #64748b);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-links a:hover,
.footer-highlight-link {
  color: var(--pink, #ee2f76) !important;
  font-weight: 600;
}

.footer-info-text {
  font-size: 14px;
  color: var(--muted, #64748b);
  line-height: 1.6;
  margin-bottom: 14px;
}

.footer-contact-item {
  font-size: 14px;
  color: var(--muted, #64748b);
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.footer-contact-item .info-label {
  font-weight: 600;
  color: var(--white, #111827);
}

.footer-tel {
  color: var(--green, #689f0e);
  font-weight: 600;
  text-decoration: none;
}

.footer-bottom {
  border-top: 1px solid var(--line, #e2e8f0);
  padding-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13.5px;
  color: var(--muted, #64748b);
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
}

@media (max-width: 600px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }
}
"""

if "RESPONSIVE AUDIT ENHANCEMENTS" not in css_content:
    with open(CSS_PATH, 'a', encoding='utf-8') as f:
        f.write(NEW_RESPONSIVE_CSS)
    print("Updated assets/service-page.css with responsive enhancements.")
else:
    print("assets/service-page.css already has responsive enhancements.")
