import os
from PIL import Image, ImageDraw, ImageFont

def create_placeholder(filename, title, tag, desc):
    width, height = 800, 600
    img = Image.new('RGB', (width, height), color='#0b0c10')
    draw = ImageDraw.Draw(img)

    # Grid pattern
    grid_size = 40
    for x in range(0, width, grid_size):
        draw.line([(x, 0), (x, height)], fill='#15161c', width=1)
    for y in range(0, height, grid_size):
        draw.line([(0, y), (width, y)], fill='#15161c', width=1)

    draw.rectangle([0, 0, width-1, height-1], outline='#222430', width=2)

    card_margin = 50
    draw.rounded_rectangle(
        [card_margin, card_margin, width - card_margin, height - card_margin],
        radius=14,
        fill='#121319',
        outline='#ee2f76',
        width=2
    )

    try:
        font_tag = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", 16)
        font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 24)
        font_desc = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 17)
    except Exception:
        font_tag = font_title = font_desc = ImageFont.load_default()

    draw.text((width // 2, 210), tag, fill='#ee2f76', font=font_tag, anchor="mm")
    draw.text((width // 2, 280), title, fill='#ffffff', font=font_title, anchor="mm")
    draw.line([(width // 2 - 100, 320), (width // 2 + 100, 320)], fill='#ee2f76', width=3)
    draw.text((width // 2, 370), desc, fill='#a0a5b5', font=font_desc, anchor="mm")

    output_path = os.path.join("/Users/apple/Documents/Trieye /assets/wash", filename)
    img.save(output_path, quality=95)
    print(f"Created placeholder: {output_path}")

placeholders = [
    ("wash-hero.jpg", "CAR WASH & FOAM WASH", "// CAR WASH HERO", "IMAGE REQUIRED: Snow foam car wash in detailing studio"),
    ("wash-intro.jpg", "HAND FOAM WASH", "// PROFESSIONAL CAR WASH", "IMAGE REQUIRED: Detailer hand washing car paint with foam mitt"),
    ("wash-clean-body.jpg", "01 BODY PANELS", "// EXTERIOR CLEANING", "IMAGE REQUIRED: Safe foam washing on car body panels"),
    ("wash-clean-wheels.jpg", "02 WHEELS", "// EXTERIOR CLEANING", "IMAGE REQUIRED: Detailer brushing alloy wheel surface"),
    ("wash-clean-tyres.jpg", "03 TYRES", "// EXTERIOR CLEANING", "IMAGE REQUIRED: Tyre cleaning and dressing close-up"),
    ("wash-clean-glass.jpg", "04 GLASS", "// EXTERIOR CLEANING", "IMAGE REQUIRED: Microfiber cleaning windshield and glass"),
    ("wash-clean-grille.jpg", "05 GRILLE & TRIMS", "// EXTERIOR CLEANING", "IMAGE REQUIRED: Soft detailing brush cleaning front grille"),
    ("wash-clean-finish.jpg", "06 FINAL WIPE", "// EXTERIOR CLEANING", "IMAGE REQUIRED: Microfiber towel drying glossy paint"),
    ("wash-process-inspection.jpg", "STEP 01: VEHICLE INSPECTION", "// WASH PROCESS", "IMAGE REQUIRED: Detailer inspecting vehicle exterior"),
    ("wash-process-foam.jpg", "STEP 02: PRE-RINSE & FOAM", "// WASH PROCESS", "IMAGE REQUIRED: Car covered with thick snow foam suds"),
    ("wash-process-handwash.jpg", "STEP 03: HAND WASH", "// WASH PROCESS", "IMAGE REQUIRED: Microfiber wash mitt cleaning car paint"),
    ("wash-process-wheels.jpg", "STEP 04: WHEELS & DETAILS", "// WASH PROCESS", "IMAGE REQUIRED: Professional wheel and rim cleaning"),
    ("wash-process-dry.jpg", "STEP 05: RINSE, DRY & CHECK", "// WASH PROCESS", "IMAGE REQUIRED: Microfiber drying towel on clean car"),
    ("wash-foam-feature.jpg", "SNOW FOAM PRE-WASH", "// FOAM WASH FEATURE", "IMAGE REQUIRED: Foam cannon spraying snow foam on dark car"),
    ("wash-why-trieye.jpg", "TRIEYE DETAILING STUDIO", "// WHY TRIEYE", "IMAGE REQUIRED: Freshly washed dark luxury car inside studio")
]

for name, title, tag, desc in placeholders:
    create_placeholder(name, title, tag, desc)
