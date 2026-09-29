import urllib.request
import urllib.parse
import json
import ssl
import os
from PIL import Image

ssl._create_default_https_context = ssl._create_unverified_context
dest_dir = '/Users/apple/Documents/Trieye /assets/interior-detailing/'
os.makedirs(dest_dir, exist_ok=True)

def search_reddit(query):
    url = f"https://www.reddit.com/r/AutoDetailing/search.json?q={urllib.parse.quote(query)}&restrict_sr=1&sort=top&limit=10"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoDetailingBot/1.0'})
    try:
        data = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        posts = data.get('data', {}).get('children', [])
        urls = []
        for post in posts:
            pdata = post['data']
            if 'url_overridden_by_dest' in pdata:
                url = pdata['url_overridden_by_dest']
                if url.endswith(('.jpg', '.jpeg', '.png')):
                    urls.append(url)
            if 'media_metadata' in pdata:
                for k, v in pdata['media_metadata'].items():
                    if 's' in v and 'u' in v['s']:
                        urls.append(v['s']['u'].replace('&amp;', '&'))
        return urls
    except Exception as e:
        print(f"Error: {e}")
        return []

searches = {
    'process-inspection': 'interior inspection',
    'process-vacuum': 'vacuum interior',
    'process-deep-cleaning': 'steam cleaning interior',
    'process-finishing': 'dashboard detail',
    'process-final-inspection': 'interior detail finished',
}

for filename, query in searches.items():
    print(f"Searching Reddit for: {query}")
    urls = search_reddit(query)
    for url in urls:
        print(f"Trying {url}")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoDetailingBot/1.0'})
            data = urllib.request.urlopen(req, timeout=10).read()
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

