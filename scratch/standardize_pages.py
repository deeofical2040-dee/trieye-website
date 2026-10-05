import glob, os, re

# Standardized Mobile Drawer HTML
MOBILE_DRAWER_HTML = """
<div class="mobile-drawer-backdrop" id="mobileDrawerBackdrop" aria-hidden="true"></div>
<div class="mobile-nav-drawer" id="mobileNavDrawer" aria-hidden="true" role="dialog" aria-label="Mobile Navigation Menu">
  <div class="mobile-drawer-header">
    <div class="mobile-drawer-brand">
      <a href="index.html" aria-label="TRIEYE Home">
        <img src="assets/trieye-logo-dark.png" alt="TRIEYE car detailing studio" class="nav-logo logo-dark">
        <img src="assets/trieye-logo-light.png" alt="TRIEYE car detailing studio" class="nav-logo logo-light">
      </a>
    </div>
    <button class="mobile-drawer-close" id="mobileDrawerClose" aria-label="Close navigation menu">&times;</button>
  </div>
  <div class="mobile-drawer-body">
    <ul class="mobile-drawer-links">
      <li><a href="index.html"><span class="m-num">01</span> Home</a></li>
      <li><a href="index.html#about"><span class="m-num">02</span> About Us</a></li>
      <li class="mobile-drawer-accordion">
        <button class="mobile-accordion-btn" id="mobileAccordionBtn" type="button" aria-expanded="false">
          <span><span class="m-num">03</span> Services</span>
          <span class="mobile-accordion-icon">+</span>
        </button>
        <ul class="mobile-accordion-content" id="mobileAccordionContent">
          <li><a href="car-wash.html" class="m-sublink">Car Wash</a></li>
          <li><a href="ceramic-coating.html" class="m-sublink">Ceramic Coating</a></li>
          <li><a href="graphene-coating.html" class="m-sublink">Graphene Coating</a></li>
          <li><a href="paint-correction.html" class="m-sublink">Paint Correction</a></li>
          <li><a href="interior-detailing.html" class="m-sublink">Interior Detailing</a></li>
          <li><a href="ppf.html" class="m-sublink">Paint Protection Film (PPF)</a></li>
          <li><a href="bike-detailing.html" class="m-sublink">Bike Detailing</a></li>
        </ul>
      </li>
      <li><a href="index.html#gallery"><span class="m-num">04</span> Gallery</a></li>
      <li><a href="track-booking.html"><span class="m-num">05</span> Track Booking</a></li>
      <li><a href="index.html#contact"><span class="m-num">06</span> Contact Us</a></li>
    </ul>
    <div class="mobile-drawer-footer">
      <a href="index.html#booking" class="mobile-drawer-book-btn" id="mobileDrawerBookBtn">
        BOOK NOW &rarr;
      </a>
    </div>
  </div>
</div>
"""

# Standardized Mobile Drawer Script
MOBILE_DRAWER_SCRIPT = """
<script>
(function initMobileDrawer() {
  const burgerBtn = document.getElementById('burgerBtn') || document.querySelector('.mobile-nav-toggle');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');
  const mobileDrawerBackdrop = document.getElementById('mobileDrawerBackdrop');
  const mobileDrawerClose = document.getElementById('mobileDrawerClose');
  const mobileAccordionBtn = document.getElementById('mobileAccordionBtn');
  const accordionContainer = document.querySelector('.mobile-drawer-accordion');

  function openMobileNav() {
    if (mobileNavDrawer && mobileDrawerBackdrop) {
      mobileNavDrawer.classList.add('open');
      mobileDrawerBackdrop.classList.add('open');
      mobileNavDrawer.setAttribute('aria-hidden', 'false');
      mobileDrawerBackdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closeMobileNav() {
    if (mobileNavDrawer && mobileDrawerBackdrop) {
      mobileNavDrawer.classList.remove('open');
      mobileDrawerBackdrop.classList.remove('open');
      mobileNavDrawer.setAttribute('aria-hidden', 'true');
      mobileDrawerBackdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false');
    }
  }

  if (burgerBtn) burgerBtn.addEventListener('click', openMobileNav);
  if (mobileDrawerClose) mobileDrawerClose.addEventListener('click', closeMobileNav);
  if (mobileDrawerBackdrop) mobileDrawerBackdrop.addEventListener('click', closeMobileNav);

  if (mobileAccordionBtn && accordionContainer) {
    mobileAccordionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = accordionContainer.classList.contains('open');
      if (isOpen) {
        accordionContainer.classList.remove('open');
        mobileAccordionBtn.setAttribute('aria-expanded', 'false');
        const icon = mobileAccordionBtn.querySelector('.mobile-accordion-icon');
        if (icon) icon.textContent = '+';
      } else {
        accordionContainer.classList.add('open');
        mobileAccordionBtn.setAttribute('aria-expanded', 'true');
        const icon = mobileAccordionBtn.querySelector('.mobile-accordion-icon');
        if (icon) icon.textContent = '−';
      }
    });
  }

  document.querySelectorAll('.mobile-drawer-links a:not(.mobile-accordion-btn), .mobile-drawer-book-btn').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNavDrawer && mobileNavDrawer.classList.contains('open')) {
      closeMobileNav();
    }
  });
})();
</script>
"""

# Standardized Global Footer HTML
GLOBAL_FOOTER_HTML = """
<footer class="site-footer">
  <div class="footer-wrap wrap">
    <div class="footer-grid">
      <!-- Col 1: Brand & Bio -->
      <div class="footer-col footer-brand">
        <a href="index.html" class="footer-logo-link" aria-label="TRIEYE Detailing Studio Home">
          <img src="assets/trieye-logo-dark.png" alt="TRIEYE car detailing studio" class="footer-logo logo-dark">
          <img src="assets/trieye-logo-light.png" alt="TRIEYE car detailing studio" class="footer-logo logo-light">
        </a>
        <p class="footer-desc">Premium car & bike detailing studio in Villivakkam, Chennai. Specialized in hydrophobic ceramic & graphene coatings, paint correction, self-healing PPF, and deep interior care.</p>
        <div class="footer-socials">
          <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram" class="social-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
          <a href="https://wa.me/919940181934" target="_blank" rel="noopener" aria-label="WhatsApp" class="social-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001l-1.416 5.169 5.297-1.389c1.472.802 3.133 1.224 4.774 1.225h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.668-1.039-5.176-2.927-7.063a9.927 9.927 0 0 0-7.063-2.942zm5.79 14.195c-.244.688-1.419 1.314-1.956 1.396-.51.077-1.163.116-3.701-.931-3.24-1.339-5.326-4.636-5.487-4.851-.161-.215-1.309-1.741-1.309-3.322 0-1.58.827-2.357 1.121-2.68.294-.323.644-.404.859-.404.215 0 .43.002.617.01.198.008.465-.075.728.556.27.646.918 2.241.998 2.403.08.162.134.35.027.565-.107.215-.161.35-.322.538-.161.188-.338.42-.483.564-.16.162-.328.338-.14.661.188.323.834 1.378 1.79 2.23 1.23 1.096 2.268 1.436 2.59 1.597.323.161.511.134.7-.08.188-.215.806-.941 1.021-1.263.215-.323.43-.269.725-.161.296.107 1.88.886 2.202 1.047.323.161.538.242.618.376.08.134.08.779-.164 1.467z"/></svg>
          </a>
          <a href="tel:+919940181934" aria-label="Call Us" class="social-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </a>
        </div>
      </div>

      <!-- Col 2: Services Links -->
      <div class="footer-col">
        <h4 class="footer-heading">Services</h4>
        <ul class="footer-links">
          <li><a href="car-wash.html">Car Wash</a></li>
          <li><a href="ceramic-coating.html">Ceramic Coating</a></li>
          <li><a href="graphene-coating.html">Graphene Coating</a></li>
          <li><a href="paint-correction.html">Paint Correction</a></li>
          <li><a href="interior-detailing.html">Interior Detailing</a></li>
          <li><a href="ppf.html">Paint Protection Film (PPF)</a></li>
          <li><a href="bike-detailing.html">Bike Detailing</a></li>
        </ul>
      </div>

      <!-- Col 3: Quick Links & Booking -->
      <div class="footer-col">
        <h4 class="footer-heading">Quick Links</h4>
        <ul class="footer-links">
          <li><a href="index.html">Home</a></li>
          <li><a href="index.html#about">About Us</a></li>
          <li><a href="index.html#gallery">Gallery</a></li>
          <li><a href="track-booking.html" class="footer-highlight-link">Track Booking &rarr;</a></li>
          <li><a href="index.html#contact">Contact & Location</a></li>
        </ul>
      </div>

      <!-- Col 4: Location & Hours -->
      <div class="footer-col">
        <h4 class="footer-heading">Studio Location</h4>
        <p class="footer-info-text">No. 19, 6th Street, 1st Main Road, Baba Nagar, Villivakkam, Chennai, Tamil Nadu 600049</p>
        <div class="footer-contact-item">
          <span class="info-label">Phone:</span>
          <a href="tel:+919940181934" class="footer-tel">+91 99401 81934</a>
        </div>
        <div class="footer-contact-item">
          <span class="info-label">Hours:</span>
          <span>Mon – Sun: 8:00 AM – 8:00 PM</span>
        </div>
      </div>
    </div>

    <!-- Bottom Footer -->
    <div class="footer-bottom">
      <div class="footer-copy">&copy; 2026 TRIEYE Detailing Studio. All rights reserved.</div>
    </div>
  </div>
</footer>
"""

# Public pages list
public_pages = [
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

dir_path = '/Users/apple/Documents/Trieye '

for filename in public_pages:
    path = os.path.join(dir_path, filename)
    if not os.path.exists(path): continue
    
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Ensure assets/service-page.css is linked in head
    if 'service-page.css' not in html:
        html = html.replace('</head>', '  <link rel="stylesheet" href="assets/service-page.css">\n</head>')

    # 2. Standardize Footer
    if '<footer' in html:
        html = re.sub(r'<footer[\s\S]*?</footer>', GLOBAL_FOOTER_HTML, html)

    # 3. Standardize Mobile Drawer HTML if present
    if 'mobileNavDrawer' in html or 'mobile-nav-drawer' in html or 'mobile-menu' in html:
        # Replace backdrop and drawer
        html = re.sub(r'<div class="mobile-drawer-backdrop"[\s\S]*?<div class="mobile-nav-drawer"[\s\S]*?</div>\s*</div>', MOBILE_DRAWER_HTML.strip(), html)
        # Check if mobile drawer script is appended before </body>
        if 'initMobileDrawer' not in html:
            html = html.replace('</body>', MOBILE_DRAWER_SCRIPT + '\n</body>')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f'Standardized {filename}')
