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

    # Tag cards in grid containers
    card_classes = ['card', 'service-card', 'process-card', 'price-card', 'pricing-card', 'spec-card', 'feature-card', 'craft-card']
    for c_cls in card_classes:
        content = re.sub(
            r'class="([^"]*\b' + c_cls + r'\b[^"]*)"',
            lambda m: m.group(0) if 'reveal-card' in m.group(1) else f'class="{m.group(1)} reveal-card"',
            content
        )

    # Tag full width banner/cta images with reveal-up
    img_classes = ['full-width-img', 'banner-img', 'cta-bg-image', 'section-banner']
    for i_cls in img_classes:
        content = re.sub(
            r'class="([^"]*\b' + i_cls + r'\b[^"]*)"',
            lambda m: m.group(0) if 'reveal-up' in m.group(1) else f'class="{m.group(1)} reveal-up"',
            content
        )

    # Tag FAQ containers & Google Reviews containers with reveal-up
    section_up_classes = ['faq-container', 'accordion', 'reviews-carousel', 'reviews-container', 'google-reviews-wrapper']
    for s_cls in section_up_classes:
        content = re.sub(
            r'class="([^"]*\b' + s_cls + r'\b[^"]*)"',
            lambda m: m.group(0) if 'reveal-up' in m.group(1) else f'class="{m.group(1)} reveal-up"',
            content
        )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Tagged cards & containers for {page}")

