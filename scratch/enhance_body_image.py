6import os
from PIL import Image, ImageEnhance, ImageFilter

input_path = "/Users/apple/.gemini/antigravity-ide/brain/6e886432-c554-4582-b527-b8be874d5408/.user_uploaded/media_1790849105492.png"
output_path = "/Users/apple/Documents/Trieye /assets/bike/bike-detail-body.jpg"

img = Image.open(input_path).convert("RGB")

# 1. Enhance Sharpness
enhancer = ImageEnhance.Sharpness(img)
img = enhancer.enhance(1.4)

# 2. Enhance Contrast
enhancer = ImageEnhance.Contrast(img)
img = enhancer.enhance(1.15)

# 3. Enhance Color Saturation slightly
enhancer = ImageEnhance.Color(img)
img = enhancer.enhance(1.08)

# 4. Enhance Brightness slightly
enhancer = ImageEnhance.Brightness(img)
img = enhancer.enhance(1.03)

# Save as high quality JPEG
img.save(output_path, quality=98, optimize=True)
print(f"Successfully processed HD image and saved to {output_path}")
