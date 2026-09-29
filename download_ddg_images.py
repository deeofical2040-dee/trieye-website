from duckduckgo_search import DDGS
import urllib.request
import urllib.error
import ssl
from PIL import Image
import os

ssl._create_default_https_context = ssl._create_unverified_context

searches = {
    'process-inspection': 'car detailer inspecting interior high quality photography -exterior',
    'process-vacuum': 'professional car interior vacuum cleaning detailing -exterior -house',
    'process-deep-cleaning': 'car interior steam cleaning extraction detailing -exterior',
    'process-finishing': 'car dashboard cleaning brush detailing -exterior',
    'process-final-inspection': 'professional detailed car interior clean finished -exterior',
}

dest_dir = '/Users/apple/Documents/Trieye /assets/interior-detailing/'
os.makedirs(dest_dir, exist_ok=True)

with DDGS() as ddgs:
    for filename, query in searches.items():
        print(f"Searching for: {query}")
        try:
            results = list(ddgs.images(query, max_results=10))
            for res in results:
                url = res['image']
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
        except Exception as e:
            print(f"Search failed for {query}: {e}")

