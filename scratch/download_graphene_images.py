import urllib.request
import ssl
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

images = {
    "graphene-hero.jpg": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=1600&auto=format&fit=crop", # Black glossy luxury car in studio
    "graphene-intro-application.jpg": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=1200&auto=format&fit=crop", # Coating application / hand on paint
    "graphene-inspection.jpg": "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=1200&auto=format&fit=crop", # Paint inspection reflection
    "graphene-decontamination.jpg": "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=1200&auto=format&fit=crop", # Car foam wash / decontamination
    "graphene-paint-prep.jpg": "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=1200&auto=format&fit=crop", # Polishing / paint prep
    "graphene-application.jpg": "https://images.unsplash.com/photo-1632823470772-ef17937553b6?q=80&w=1200&auto=format&fit=crop", # Applicator on clear coat
    "graphene-final-inspection.jpg": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop", # Studio lights on glossy vehicle
    "graphene-hydrophobic.jpg": "https://images.unsplash.com/photo-1527247043589-98e6ac08f56c?q=80&w=1200&auto=format&fit=crop", # Water drops / hydrophobic beading
    "graphene-workmanship.jpg": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop", # Detailer studio workmanship
    "graphene-result-prep.jpg": "https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?q=80&w=1200&auto=format&fit=crop", # Polished reflective surface
    "graphene-result-app.jpg": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=1200&auto=format&fit=crop", # Coating application close-up
    "graphene-result-gloss.jpg": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=1200&auto=format&fit=crop" # Glossy black car finish
}

os.makedirs("assets/graphene", exist_ok=True)

for name, url in images.items():
    dest = os.path.join("assets/graphene", name)
    print(f"Downloading {name}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response, open(dest, 'wb') as out_file:
            out_file.write(response.read())
        print(f"✓ Saved {dest} ({os.path.getsize(dest)} bytes)")
    except Exception as e:
        print(f"❌ Failed {name}: {e}")

