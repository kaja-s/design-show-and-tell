"""Turns a cut-out portrait (transparent background) into the halftone source for
comp.html: a 1080×1080 grayscale PNG on white (white is discarded by the shader),
head top-centre, body running off the bottom like the wolf's "b" framing.

The cut-out came from the original photo via macOS Vision subject lifting
(VNGenerateForegroundInstanceMaskRequest); any background remover works.

    python3 graphics/speaker-nika/prepare.py <cutout.png> graphics/speaker-nika/nika-halftone.png
"""
import sys
from PIL import Image, ImageFilter, ImageOps

SIZE = 1080
SCALE = 1.3            # face large enough that eyes and mouth span several 14px dots
FACE = (470, 520)      # face centre in the source photo
TARGET = (545, 450)    # where the face centre lands in the square
FLOOR = 0.18           # darkest luma: keeps the black top a dense field, not a solid blob
GAMMA = 1.7            # >1 darkens the mid-tones so features read as dots

src = Image.open(sys.argv[1]).convert("RGBA")
src = src.resize((round(src.width * SCALE), round(src.height * SCALE)), Image.LANCZOS)

canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
x = TARGET[0] - round(FACE[0] * SCALE)
y = TARGET[1] - round(FACE[1] * SCALE)
canvas.alpha_composite(src, (x, y))

gray = ImageOps.grayscale(canvas.convert("RGB"))
# local contrast: a wide unsharp mask pulls eyes, brows and mouth away from the skin
gray = gray.filter(ImageFilter.UnsharpMask(radius=14, percent=160, threshold=2))
lut = [255 if v >= 250 else round(255 * (FLOOR + (1 - FLOOR) * (v / 255) ** GAMMA)) for v in range(256)]
gray.point(lut).save(sys.argv[2])
