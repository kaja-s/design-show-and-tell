"""Turns a cut-out portrait (transparent background) into the halftone source for
comp.html: a 1080×1080 grayscale PNG on white (white is discarded by the shader),
head top-centre, matching romina's framing.

Her hair runs off the post's left edge and her body off the bottom, like romina's. The
photo's right edge lands inside the post, so it fades to white and the dots dissolve
instead of ending on a straight line.

The cut-out came from the original photo via macOS Vision subject lifting
(VNGenerateForegroundInstanceMaskRequest); any background remover works.

    python3 graphics/speaker-nina/prepare.py graphics/speaker-nina/nina-cutout.png graphics/speaker-nina/nina-halftone.png
"""
import sys
from PIL import Image, ImageChops, ImageFilter, ImageOps

SIZE = 1080
SCALE = 0.72           # large enough that the photo's left edge bleeds off the post
FACE = (610, 660)      # face centre in the source photo
TARGET = (520, 470)    # face centre in the square; keeps her hair clear of the status line
FADE = 140             # source px over which the photo's right edge fades out
FLOOR = 0.05           # darkest luma
GAMMA = 1.4

src = Image.open(sys.argv[1]).convert("RGBA")

# fade the alpha towards the right edge of the photo
w, h = src.size
ramp = Image.new("L", (w, h), 255)
px = ramp.load()
for y in range(h):
    for x in range(w):
        d = w - 1 - x
        if d < FADE:
            px[x, y] = round(255 * (d / FADE) ** 1.5)
src.putalpha(ImageChops.multiply(src.getchannel("A"), ramp))

src = src.resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS)
canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
canvas.alpha_composite(src, (TARGET[0] - round(FACE[0] * SCALE), TARGET[1] - round(FACE[1] * SCALE)))

gray = ImageOps.grayscale(canvas.convert("RGB"))
# local contrast: pulls eyes, brows and mouth out of the skin after the upscale
gray = gray.filter(ImageFilter.UnsharpMask(radius=6, percent=350, threshold=2))
lut = [255 if v >= 250 else round(255 * (FLOOR + (1 - FLOOR) * (v / 255) ** GAMMA)) for v in range(256)]
gray.point(lut).save(sys.argv[2])
