import os
from PIL import Image, ImageDraw, ImageFont

# Create a 800x600 high resolution dark studio graphic for Bike Body Panels Detailing
width, height = 800, 600
img = Image.new('RGB', (width, height), color='#0b0c10')
draw = ImageDraw.Draw(img)

# Draw subtle dark grid pattern
grid_size = 40
for x in range(0, width, grid_size):
    draw.line([(x, 0), (x, height)], fill='#15161c', width=1)
for y in range(0, height, grid_size):
    draw.line([(0, y), (width, y)], fill='#15161c', width=1)

# Draw subtle outer border highlight
draw.rectangle([0, 0, width-1, height-1], outline='#222430', width=2)

# Central card background
card_margin = 60
draw.rounded_rectangle(
    [card_margin, card_margin, width - card_margin, height - card_margin],
    radius=16,
    fill='#121319',
    outline='#ee2f76',
    width=2
)

# Text details
tag_text = "// IMAGE PLACEHOLDER"
title_text = "01  BODY PANELS DETAILING"
desc_text = "IMAGE REQUIRED: Foam cleaning motorcycle body panels with wash mitt"

try:
    font_tag = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", 16)
    font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 26)
    font_desc = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
except Exception:
    font_tag = font_title = font_desc = ImageFont.load_default()

# Draw Tag
draw.text((width // 2, 210), tag_text, fill='#ee2f76', font=font_tag, anchor="mm")

# Draw Title
draw.text((width // 2, 280), title_text, fill='#ffffff', font=font_title, anchor="mm")

# Draw Line
draw.line([(width // 2 - 120, 320), (width // 2 + 120, 320)], fill='#ee2f76', width=3)

# Draw Description
draw.text((width // 2, 370), desc_text, fill='#a0a5b5', font=font_desc, anchor="mm")

output_path = "/Users/apple/Documents/Trieye /assets/bike/bike-detail-body.jpg"
img.save(output_path, quality=95)
print(f"Saved generated placeholder image to {output_path}")
