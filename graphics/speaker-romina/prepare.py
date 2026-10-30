"""Turns a cut-out portrait (transparent background) into the halftone source for
comp.html: a 1080×1080 grayscale PNG on white (white is discarded by the shader),
head top-centre, body running off the bottom like the wolf's "b" framing.

The cut-out came from the original photo via macOS Vision subject lifting
(VNGenerateForegroundInstanceMaskRequest); any background remover works.

    python3 graphics/speaker-romina/prepare.py graphics/speaker-romina/romina-cutout.png graphics/speaker-romina/romina-halftone.png
"""
import sys
from PIL import Image, ImageFilter, ImageOps

SIZE = 1080
SCALE = 1.7            # her face is smaller in the frame than nika's; this brings it to the same size
FACE = (765, 392)      # face centre in the source photo
TARGET = (540, 400)    # where the face centre lands in the square
FLOOR = 0.05           # darkest luma
GAMMA = 1.2            # her fair skin needs little darkening; the unsharp mask does the work

src = Image.open(sys.argv[1]).convert("RGBA")
src = src.resize((round(src.width * SCALE), round(src.height * SCALE)), Image.LANCZOS)

canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
x = TARGET[0] - round(FACE[0] * SCALE)
y = TARGET[1] - round(FACE[1] * SCALE)
canvas.alpha_composite(src, (x, y))

gray = ImageOps.grayscale(canvas.convert("RGB"))
# local contrast: a tight, strong unsharp mask pulls eyes, brows and mouth out of the pale skin
gray = gray.filter(ImageFilter.UnsharpMask(radius=6, percent=400, threshold=2))
lut = [255 if v >= 250 else round(255 * (FLOOR + (1 - FLOOR) * (v / 255) ** GAMMA)) for v in range(256)]
gray.point(lut).save(sys.argv[2])
