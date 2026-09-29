import urllib.request
import urllib.parse
import json
import ssl
import os
from PIL import Image

ssl._create_default_https_context = ssl._create_unverified_context

searches = {
    'process-inspection': 'car interior',
    'process-vacuum': 'car vacuum',
    'process-deep-cleaning': 'car steam cleaning interior',
    'process-finishing': 'car detailing interior',
    'process-final-inspection': 'clean car interior',
}

dest_dir = '/Users/apple/Documents/Trieye /assets/interior-detailing/'
os.makedirs(dest_dir, exist_ok=True)

def search_wikimedia(query):
    # Use Commons API
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        data = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        pages = data.get('query', {}).get('pages', {})
        urls = []
        for page_id, page_info in pages.items():
            if 'imageinfo' in page_info:
                urls.append(page_info['imageinfo'][0]['url'])
        return [u for u in urls if u.lower().endswith(('.jpg', '.jpeg', '.png'))]
    except Exception as e:
        print(f"Error: {e}")
        return []

for filename, query in searches.items():
    print(f"Searching Wikimedia for: {query}")
    urls = search_wikimedia(query)
    for url in urls:
        print(f"Trying {url}")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            data = urllib.request.urlopen(req, timeout=5).read()
            tmp_path = f"/tmp/{filename}.img"
            with open(tmp_path, 'wb') as f:
                f.write(data)
            img = Image.open(tmp_path)
            if img.mode == 'RGBA': img = img.convert('RGB')
            dest_path = os.path.join(dest_dir, f"{filename}.webp")
            img.save(dest_path, 'webp', quality=85)
            print(f"Saved {dest_path}")
            os.remove(tmp_path)
            break
        except Exception as e:
            print(f"Failed {url}: {e}")
