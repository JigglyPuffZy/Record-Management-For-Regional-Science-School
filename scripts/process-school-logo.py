"""Preserve the original gold ink, remove neutral gray, and export transparent assets.

Usage: python scripts/process-school-logo.py INPUT_IMAGE
Requires Pillow. No AI redraw or changes to the original lettering/shapes.
"""
from pathlib import Path
import sys
from PIL import Image

source = Image.open(sys.argv[1]).convert('RGB')
pixels = []
for red, green, blue in source.getdata():
    # Gold ink has a red channel of 255 and blue of 0. Neutral gray has
    # equal channels. Their chroma difference recovers coverage without
    # retaining gray fringes in antialiased boundary pixels.
    chroma = red - blue
    if chroma <= 4:
        pixels.append((0, 0, 0, 0))
    else:
        ink_green = round(255 * max(0, green - blue) / chroma)
        pixels.append((255, min(255, ink_green), 0, min(255, chroma)))

cutout = Image.new('RGBA', source.size)
cutout.putdata(pixels)
bounds = cutout.getbbox()
if not bounds:
    raise ValueError('No gold artwork detected.')
artwork = cutout.crop(bounds)
edge = round(max(artwork.size) / 0.88)
square = Image.new('RGBA', (edge, edge), (0, 0, 0, 0))
square.alpha_composite(artwork, ((edge - artwork.width) // 2, (edge - artwork.height) // 2))
output = Path(__file__).resolve().parent.parent / 'public'
for size, filename in [(4096, 'school-logo-4k.png'), (512, 'school-logo.png'), (256, 'school-favicon.png')]:
    result = square.resize((size, size), Image.Resampling.LANCZOS)
    result.save(output / filename, optimize=True)
    alpha = result.getchannel('A')
    assert alpha.getextrema() == (0, 255)
    assert all(result.getpixel(point)[3] == 0 for point in [(0, 0), (0, size - 1), (size - 1, 0), (size - 1, size - 1)])
    print(f'{filename}: {size} x {size}, RGBA, transparent background')
