import urllib.request
import ssl
import os
from PIL import Image, ImageDraw, ImageFont

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

os.makedirs("assets/graphene", exist_ok=True)

# 1. Download missing graphene-application.jpg
app_url = "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=1200&auto=format&fit=crop"
req = urllib.request.Request(app_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as response, open("assets/graphene/graphene-application.jpg", "wb") as f:
    f.write(response.read())
print("✓ Downloaded assets/graphene/graphene-application.jpg")

# 2. Build crisp split comparison visual for "PROTECTION YOU CAN SEE"
# Uses high-res dark vehicle reflections and creates bonnet split visual
img1_path = "assets/graphene/graphene-hero.jpg"
img2_path = "assets/graphene/graphene-decontamination.jpg"

if os.path.exists(img1_path) and os.path.exists(img2_path):
    img_left = Image.open(img1_path).convert("RGB")
    img_right = Image.open(img2_path).convert("RGB")
    
    target_w, target_h = 1280, 720
    img_left = img_left.resize((target_w, target_h), Image.LANCZOS)
    img_right = img_right.resize((target_w, target_h), Image.LANCZOS)
    
    comp = Image.new("RGB", (target_w, target_h))
    # Left half: coated glossy side
    comp.paste(img_left.crop((0, 0, target_w//2, target_h)), (0, 0))
    # Right half: uncoated side
    comp.paste(img_right.crop((target_w//2, 0, target_w, target_h)), (target_w//2, 0))
    
    draw = ImageDraw.Draw(comp)
    # Vertical line separator
    draw.line([(target_w//2, 0), (target_w//2, target_h)], fill="#ee2f76", width=4)
    
    # Try default or truetype font
    try:
        font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 28)
        font_sub = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 18)
    except:
        font = ImageFont.load_default()
        font_sub = font

    # Left Label Pill
    draw.rectangle([30, 30, 320, 80], fill=(10, 10, 11, 230))
    draw.text((45, 42), "GRAPHENE COATING", fill="#689f0e", font=font)

    # Right Label Pill
    draw.rectangle([target_w - 240, 30, target_w - 30, 80], fill=(10, 10, 11, 230))
    draw.text((target_w - 225, 42), "NO COATING", fill="#dc2626", font=font)

    comp.save("assets/graphene/graphene-comparison.jpg", quality=92)
    print("✓ Created assets/graphene/graphene-comparison.jpg")

