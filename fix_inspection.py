with open("interior-detailing.html", "r") as f:
    content = f.read()

# I need to change the image for "inspection" which is in the PROCESS section. 
# Let's find the PROCESS section and patch it.
# The previous alt text was probably changed or the URL was changed to interior-deep-cleaning.webp
content = content.replace(
    'assets/interior-detailing/interior-deep-cleaning.webp" alt="Technician inspecting interior"',
    'assets/interior-detailing/inspection.webp" alt="Professional car interior inspection"'
)

with open("interior-detailing.html", "w") as f:
    f.write(content)
