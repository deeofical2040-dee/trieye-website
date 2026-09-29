import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def get_images(page_title):
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={page_title}&prop=images&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        data = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        pages = data['query']['pages']
        for page_id, page_data in pages.items():
            if 'images' in page_data:
                for img in page_data['images']:
                    print(img['title'])
    except Exception as e:
        print(e)

get_images("Auto_detailing")
get_images("Car_interior")
