import os
import re

pages = [
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

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

for page in pages:
    file_path = os.path.join(root_dir, page)
    if not os.path.exists(file_path):
        print(f"Skipping {page}, not found.")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add script before </body> if missing
    if 'assets/scroll-reveal.js' not in content:
        content = content.replace('</body>', '  <script src="assets/scroll-reveal.js" defer></script>\n</body>')

    # 2. Add reveal-text to sec-tag / section-subtitle
    content = re.sub(r'class="([^"]*sec-tag[^"]*)"', lambda m: m.group(0) if 'reveal-text' in m.group(1) else f'class="{m.group(1)} reveal-text"', content)
    content = re.sub(r'class="([^"]*section-subtitle[^"]*)"', lambda m: m.group(0) if 'reveal-text' in m.group(1) else f'class="{m.group(1)} reveal-text"', content)
    content = re.sub(r'class="([^"]*sec-title[^"]*)"', lambda m: m.group(0) if 'reveal-text' in m.group(1) else f'class="{m.group(1)} reveal-text"', content)
    content = re.sub(r'class="([^"]*section-title[^"]*)"', lambda m: m.group(0) if 'reveal-text' in m.group(1) else f'class="{m.group(1)} reveal-text"', content)
    content = re.sub(r'class="([^"]*sec-desc[^"]*)"', lambda m: m.group(0) if 'reveal-text' in m.group(1) else f'class="{m.group(1)} reveal-text"', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {page}")

