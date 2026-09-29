import re

with open("interior-detailing.html", "r") as f:
    content = f.read()

# Replace specific SVGs with img tags
# Floor mats:
svg_floor_mats = '''<div style="width: 80px; height: 80px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        </div>'''
img_floor_mats = '<img src="assets/interior-detailing/floor-mat-cleaning.webp" alt="Car floor mat cleaning" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" loading="lazy" decoding="async">'
content = content.replace(svg_floor_mats, img_floor_mats)

# Boot area:
svg_boot = '''<div style="width: 80px; height: 80px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        </div>'''
img_boot = '<img src="assets/interior-detailing/boot-cleaning.webp" alt="Car boot vacuum cleaning" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" loading="lazy" decoding="async">'
content = content.replace(svg_boot, img_boot)


replacements = [
    ('assets/interior-detailing/interior-hero.jpg', 'assets/interior-detailing/interior-hero.webp'),
    ('assets/interior-detailing/interior-intro.jpg', 'assets/interior-detailing/interior-deep-cleaning.webp'),
    ('assets/interior-detailing/seat-cleaning.jpg" alt="Car seat cleaning"', 'assets/interior-detailing/seat-cleaning.webp" alt="Car seat cleaning and vacuuming"'),
    ('assets/interior-detailing/carpet-vacuum.jpg" alt="Car carpet cleaning"', 'assets/interior-detailing/carpet-cleaning.webp" alt="Car carpet deep cleaning"'),
    ('assets/interior-detailing/dashboard-detailing.jpg" alt="Dashboard and centre console detailing"', 'assets/interior-detailing/dashboard-detailing.webp" alt="Dashboard and centre console detailing"'),
    ('assets/interior-detailing/door-panel-cleaning.jpg" alt="Door panel cleaning"', 'assets/interior-detailing/door-panel-cleaning.webp" alt="Car door panel interior cleaning"'),
    ('assets/interior-detailing/interior-intro.jpg" alt="Technician inspecting interior"', 'assets/interior-detailing/inspection.webp" alt="Professional car interior inspection"'),
    ('assets/interior-detailing/carpet-vacuum.jpg" alt="Vacuum cleaning car seat and carpet"', 'assets/interior-detailing/vacuum-cleaning.webp" alt="Car interior vacuum cleaning"'),
    ('assets/interior-detailing/seat-cleaning.jpg" alt="Seat/carpet deep cleaning"', 'assets/interior-detailing/deep-surface-cleaning.webp" alt="Professional car interior deep cleaning"'),
    ('assets/interior-detailing/dashboard-detailing.jpg" alt="Dashboard detailing brush cleaning"', 'assets/interior-detailing/interior-finishing.webp" alt="Dashboard and centre console detailing"'),
    ('assets/interior-detailing/interior-final.jpg" alt="Clean finished vehicle interior"', 'assets/interior-detailing/final-interior.webp" alt="Finished clean car interior"'),
    ('assets/interior-detailing/seat-cleaning.jpg" alt="Seat cleaning"', 'assets/interior-detailing/result-seat.webp" alt="Clean car seat"'),
    ('assets/interior-detailing/carpet-vacuum.jpg" alt="Car carpet and floor mat cleaning"', 'assets/interior-detailing/result-carpet.webp" alt="Clean car carpet"'),
    ('assets/interior-detailing/dashboard-detailing.jpg" alt="Dashboard detailing"', 'assets/interior-detailing/result-dashboard.webp" alt="Clean dashboard"'),
    ('assets/interior-detailing/interior-final.jpg" alt="Clean car interior after professional detailing"', 'assets/interior-detailing/why-trieye-interior.webp" alt="Clean car interior after professional detailing"'),
]

for old, new in replacements:
    content = content.replace(old, new)

# Fallback catchall for any missed ones (except we shouldn't have any)
content = content.replace('assets/interior-detailing/interior-intro.jpg', 'assets/interior-detailing/inspection.webp')
content = content.replace('assets/interior-detailing/carpet-vacuum.jpg', 'assets/interior-detailing/vacuum-cleaning.webp')
content = content.replace('assets/interior-detailing/seat-cleaning.jpg', 'assets/interior-detailing/deep-surface-cleaning.webp')
content = content.replace('assets/interior-detailing/dashboard-detailing.jpg', 'assets/interior-detailing/interior-finishing.webp')
content = content.replace('assets/interior-detailing/door-panel-cleaning.jpg', 'assets/interior-detailing/door-panel-cleaning.webp')
content = content.replace('assets/interior-detailing/interior-final.jpg', 'assets/interior-detailing/final-interior.webp')

with open("interior-detailing.html", "w") as f:
    f.write(content)
