import os
import shutil
from PIL import Image

src_dir = '/Users/apple/Documents/Trieye /assets/interior-detailing'

# Map the 17 required webp names to one of our 5 valid source jpegs
mappings = {
    'interior-hero.webp': ('interior-final.jpg', 'crop1'),
    'interior-deep-cleaning.webp': ('interior-intro.jpg', 'none'),
    'seat-cleaning.webp': ('seat-cleaning.jpg', 'none'),
    'carpet-cleaning.webp': ('carpet-vacuum.jpg', 'none'),
    'floor-mat-cleaning.webp': ('carpet-vacuum.jpg', 'crop1'),
    'dashboard-detailing.webp': ('door-panel-cleaning.jpg', 'crop1'),
    'door-panel-cleaning.webp': ('door-panel-cleaning.jpg', 'none'),
    'boot-cleaning.webp': ('carpet-vacuum.jpg', 'crop2'),
    'inspection.webp': ('interior-intro.jpg', 'crop1'),
    'vacuum-cleaning.webp': ('carpet-vacuum.jpg', 'flip'),
    'deep-surface-cleaning.webp': ('seat-cleaning.jpg', 'crop1'),
    'interior-finishing.webp': ('door-panel-cleaning.jpg', 'flip'),
    'final-interior.webp': ('interior-final.jpg', 'none'),
    'result-seat.webp': ('seat-cleaning.jpg', 'flip'),
    'result-carpet.webp': ('carpet-vacuum.jpg', 'crop3'),
    'result-dashboard.webp': ('door-panel-cleaning.jpg', 'crop2'),
    'why-trieye-interior.webp': ('interior-final.jpg', 'flip')
}

for dest_name, (src_name, transform) in mappings.items():
    src_path = os.path.join(src_dir, src_name)
    dest_path = os.path.join(src_dir, dest_name)
    
    if os.path.exists(src_path):
        img = Image.open(src_path)
        
        if transform == 'flip':
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        elif transform == 'crop1':
            w, h = img.size
            img = img.crop((w*0.1, h*0.1, w*0.9, h*0.9))
        elif transform == 'crop2':
            w, h = img.size
            img = img.crop((0, h*0.2, w*0.8, h))
        elif transform == 'crop3':
            w, h = img.size
            img = img.crop((w*0.2, 0, w, h*0.8))
            
        img.save(dest_path, 'webp', quality=85)
        print(f"Created {dest_name}")
    else:
        print(f"Source missing: {src_name}")

