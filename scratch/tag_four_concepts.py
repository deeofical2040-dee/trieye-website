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
        continue

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Mask reveal for major headings (.sec-title, .section-title, .heading-main)
    content = re.sub(
        r'class="([^"]*\b(sec-title|section-title|heading-main)\b[^"]*)"',
        lambda m: m.group(0) if 'reveal-mask' in m.group(1) else f'class="{m.group(1)} reveal-mask"',
        content
    )

    # 2. Selective Morph for key visual sections (Before/After, feature showcase images, craftsmanship images)
    content = re.sub(
        r'class="([^"]*\b(intro-img|why-trieye-img|feature-showcase-img|before-after-img|craft-img)\b[^"]*)"',
        lambda m: m.group(0) if 'reveal-morph' in m.group(1) else f'class="{m.group(1)} reveal-morph"',
        content
    )

    # 3. Card Spread for 3-card grid rows
    # Target 3-card grids: tag card 1 with reveal-card-left, card 2 with reveal-card-up, card 3 with reveal-card-right
    def tag_cards(match):
        grid_html = match.group(0)
        cards = re.findall(r'<div class="[^"]*\b(card|service-card|process-card|price-card|pricing-card|spec-card|feature-card)\b[^"]*"', grid_html)
        if len(cards) == 3:
            # Tag card 1
            grid_html = re.sub(r'class="([^"]*\b(card|service-card|process-card|price-card|pricing-card|spec-card|feature-card)\b[^"]*)"', r'class="\1 reveal-card-left"', grid_html, count=1)
            # Tag card 2
            def replace_card_2(m):
                return m.group(0).replace('reveal-card-left', 'reveal-card-up') if 'reveal-card-left' in m.group(0) else m.group(0).replace('class="', 'class="reveal-card-up ')
            # Use split replace for 2nd and 3rd
        return grid_html

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed 4 concepts tagging for {page}")

