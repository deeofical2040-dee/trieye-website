import urllib.request
import urllib.error
import re
import os
import ssl
from PIL import Image

ssl._create_default_https_context = ssl._create_unverified_context

def get_image_url(query):
    url = f"https://unsplash.com/s/photos/{query.replace(' ', '-')}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Find images matching https://images.unsplash.com/photo-...
        matches = re.findall(r'https://images.unsplash.com/photo-[\w-]+', html)
        # Filter and deduplicate
        unique_matches = list(set(matches))
        return unique_matches
    except Exception as e:
        print(f"Error for {query}: {e}")
        return []

queries = {
    'interior-hero': 'luxury car interior',
    'interior-deep-cleaning': 'car detailing',
    'seat-cleaning': 'car seat leather',
    'carpet-cleaning': 'car floor mat',
    'floor-mat-cleaning': 'car mat',
    'dashboard-detailing': 'car dashboard',
    'door-panel-cleaning': 'car door interior',
    'boot-cleaning': 'car trunk',
    'inspection': 'mechanic inspection',
    'vacuum-cleaning': 'vacuuming car',
    'deep-surface-cleaning': 'cleaning car interior',
    'interior-finishing': 'car interior detail',
    'final-interior': 'clean car interior',
    'result-seat': 'car leather seat',
    'result-carpet': 'clean car floor',
    'result-dashboard': 'car interior dashboard',
    'why-trieye-interior': 'premium car interior'
}

os.makedirs('assets/interior-detailing', exist_ok=True)

used_urls = set()

for name, query in queries.items():
    print(f"Fetching for {name} ({query})...")
    urls = get_image_url(query)
    url_to_use = None
    for u in urls:
        if u not in used_urls:
            url_to_use = u
            used_urls.add(u)
            break
    
    if url_to_use:
        try:
            download_url = f"{url_to_use}?auto=format&fit=crop&w=1200&q=80"
            req = urllib.request.Request(download_url, headers={'User-Agent': 'Mozilla/5.0'})
            img_data = urllib.request.urlopen(req).read()
            
            temp_path = f"assets/interior-detailing/{name}.jpg"
            with open(temp_path, 'wb') as f:
                f.write(img_data)
            
            # Convert to WebP
            img = Image.open(temp_path)
            webp_path = f"assets/interior-detailing/{name}.webp"
            img.save(webp_path, 'webp', quality=85)
            
            # Verify the conversion
            img.verify()
            
            os.remove(temp_path)
            print(f"Successfully created {webp_path}")
        except Exception as e:
            print(f"Failed to process {name}: {e}")
    else:
        print(f"No unused image found for {name}")

