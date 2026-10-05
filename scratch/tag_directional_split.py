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

    # Split grids tagging:
    # 1. Image in column 2 (Right side) -> reveal-right
    # 2. Image in column 1 (Left side) -> reveal-left

    # Match split-grid or intro-grid divs and analyze children or image tags inside
    # Let's inspect class attributes of image wrappers in 2-col grids
    # e.g., <div class="intro-media ..."> or <div class="about-image ..."> or <div class="split-image ...">
    content = re.sub(
        r'class="([^"]*\b(intro-media|about-media|split-media|media-col|about-image|service-image|intro-image)\b[^"]*)"',
        lambda m: m.group(0) if ('reveal-left' in m.group(1) or 'reveal-right' in m.group(1)) 
                  else (f'class="{m.group(1)} reveal-left"' if 'left' in m.group(1) or 'col-1' in m.group(1) or 'order-1' in m.group(1) 
                        else f'class="{m.group(1)} reveal-right"'),
        content
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Split grids tagged for {page}")

