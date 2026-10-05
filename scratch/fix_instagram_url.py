import os, re

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
INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/trieye_detailing'

for fname in PUBLIC_PAGES:
    path = os.path.join(DIR_PATH, fname)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            html = f.read()

        # Replace generic instagram link with direct profile URL
        html_updated = html.replace('href="https://www.instagram.com"', f'href="{INSTAGRAM_PROFILE_URL}"')
        html_updated = html_updated.replace('href="https://instagram.com"', f'href="{INSTAGRAM_PROFILE_URL}"')

        with open(path, 'w', encoding='utf-8') as f:
            f.write(html_updated)

        print(f"Updated Instagram profile link in {fname}")
