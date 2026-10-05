import os, re

CSS_PATH = '/Users/apple/Documents/Trieye /assets/service-page.css'

with open(CSS_PATH, 'r', encoding='utf-8') as f:
    css = f.read()

# Update .hero-desc style
old_hero_desc = r'\.hero-desc\s*\{[^}]+\}'
new_hero_desc = """.hero-desc{
    font-size:clamp(14.5px, 1.15vw, 17px);
    line-height:1.6;
    color:#1e293b;
    font-weight:500;
    max-width:480px;
    margin:0 0 clamp(20px, 3.2vh, 32px);
    width:100%;min-width:0;
    text-shadow: 0 1px 3px rgba(255, 255, 255, 0.95);
  }

  [data-theme="dark"] .hero-desc{
    color:#f1f5f9;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  }"""

old_hero_content = r'\.hero-content\s*\{[^}]+\}'
new_hero_content = """.hero-content{
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:flex-start;
    width:100%;
    max-width:520px;
    box-sizing:border-box;
    min-width:0;
  }"""

css_fixed = re.sub(old_hero_desc, new_hero_desc, css, count=1)
css_fixed = re.sub(old_hero_content, new_hero_content, css_fixed, count=1)

with open(CSS_PATH, 'w', encoding='utf-8') as f:
    f.write(css_fixed)

print("Updated .hero-desc and .hero-content contrast in assets/service-page.css.")
