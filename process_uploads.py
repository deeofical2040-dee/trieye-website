from PIL import Image
import os
import glob

# Find the three newest files in the user uploads directory
uploads_dir = '/Users/apple/.gemini/antigravity-ide/brain/a09e2e96-3071-428b-8a03-c81bbee19ccc/.user_uploaded/'
files = glob.glob(os.path.join(uploads_dir, '*.png'))
files.sort(key=os.path.getmtime, reverse=True)
newest = files[:3]
# Since we reverse sorted, newest[0] is the 3rd image, newest[1] is the 2nd, newest[2] is the 1st
img3 = newest[0]
img2 = newest[1]
img1 = newest[2]

dest_dir = '/Users/apple/Documents/Trieye /assets/interior-detailing/'

# 1st image -> dashboard detailing
i1 = Image.open(img1)
if i1.mode == 'RGBA': i1 = i1.convert('RGB')
i1.save(os.path.join(dest_dir, 'dashboard-detailing.webp'), 'webp', quality=85)

# 2nd image -> seat cleaning
i2 = Image.open(img2)
if i2.mode == 'RGBA': i2 = i2.convert('RGB')
i2.save(os.path.join(dest_dir, 'seat-cleaning.webp'), 'webp', quality=85)

# 3rd image -> carpet / floor mat
i3 = Image.open(img3)
if i3.mode == 'RGBA': i3 = i3.convert('RGB')
i3.save(os.path.join(dest_dir, 'carpet-cleaning.webp'), 'webp', quality=85)
i3.save(os.path.join(dest_dir, 'floor-mat-cleaning.webp'), 'webp', quality=85)

print("Processed and replaced successfully.")

