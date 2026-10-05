import os, re

CSS_PATH = '/Users/apple/Documents/Trieye /assets/service-page.css'

with open(CSS_PATH, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace desktop hero-bg-overlay gradient
old_overlay = r'\.hero-bg-overlay\s*\{[^}]+\}'
new_overlay = """.hero-bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.96) 0%,
    rgba(255, 255, 255, 0.88) 22%,
    rgba(255, 255, 255, 0.45) 38%,
    rgba(255, 255, 255, 0.10) 52%,
    rgba(255, 255, 255, 0.00) 65%
  );
  pointer-events: none;
  z-index: 1;
}"""

old_dark_overlay = r'\[data-theme="dark"\] \.hero-bg-overlay\s*\{[^}]+\}'
new_dark_overlay = """[data-theme="dark"] .hero-bg-overlay {
  background: linear-gradient(
    90deg,
    rgba(15, 23, 42, 0.96) 0%,
    rgba(15, 23, 42, 0.88) 22%,
    rgba(15, 23, 42, 0.45) 38%,
    rgba(15, 23, 42, 0.10) 52%,
    rgba(15, 23, 42, 0.00) 65%
  );
}"""

# Update mobile overlay in media query as well
old_mobile_overlay = r'/\* Restore Hero Image Visibility on Mobile \*/\s*\.hero-bg-overlay\s*\{[^}]+\}'
new_mobile_overlay = """/* Restore Hero Image Visibility on Mobile */
  .hero-bg-overlay {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.96) 0%,
      rgba(255, 255, 255, 0.85) 35%,
      rgba(255, 255, 255, 0.30) 60%,
      rgba(255, 255, 255, 0.00) 85%
    ) !important;
  }"""

css_fixed = re.sub(old_overlay, new_overlay, css, count=1)
css_fixed = re.sub(old_dark_overlay, new_dark_overlay, css_fixed, count=1)
css_fixed = re.sub(old_mobile_overlay, new_mobile_overlay, css_fixed, count=1)

with open(CSS_PATH, 'w', encoding='utf-8') as f:
    f.write(css_fixed)

print("Updated hero-bg-overlay in assets/service-page.css for crisp Porsche clarity.")
