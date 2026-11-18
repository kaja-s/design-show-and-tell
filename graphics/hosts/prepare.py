"""Host portraits for the intro slides → public/slides/<name>-halftone.png and
<name>-tint.png (the blue-toned photo the hosts slide uses)
(720px square, grayscale on white; the slide shader drops tones above 0.85).

Framing matches across hosts: head-and-shoulders, the head ~a third of the width with a
little air above the hair, shoulders running off the left edge so the dots line up with
the text under them. Tones are squeezed into 0.05–0.80 so highlights keep small dots.

    swift graphics/hosts/lift.swift graphics/hosts/<name>.jpg graphics/hosts/<name>-cutout.png
    python3 graphics/hosts/prepare.py            # rebuilds every host below
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageOps

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "public" / "slides"

HOSTS = {
    # crop = (left, top, size) in source px of the cut-out, or (left, top, width, height)
    # for a wider-than-tall frame: it's scaled to the full width and set at the bottom of
    # the white square (white is dropped by the shader, so the slide shows just the crop)
    # kaja: sunlit skin has little range in luma; green+blue keep the shading, a wide
    # unsharp mask brings out the features, gamma < 1 keeps the face light
    "kaja": dict(crop=(0, 226, 1433, 1130), channels=(0, 0.6, 0.4), unsharp=24, gamma=0.85),
    "anuska": dict(crop=(0, 0, 800), channels=None, unsharp=0, gamma=1.3),
}

for name, o in HOSTS.items():
    src = Image.open(HERE / f"{name}-cutout.png").convert("RGBA")
    r, g, b, a = src.split()
    if o["channels"]:
        wr, wg, wb = o["channels"]
        gray = ImageChops.add(ImageChops.add(r.point(lambda v: v * wr), g.point(lambda v: v * wg)), b.point(lambda v: v * wb))
    else:
        gray = src.convert("L")
    if o["unsharp"]:
        gray = gray.filter(ImageFilter.UnsharpMask(radius=o["unsharp"], percent=120, threshold=0))
    gray = ImageOps.autocontrast(gray, cutoff=1, mask=a.point(lambda v: 255 if v > 128 else 0))
    gray = gray.point(lambda v, k=o["gamma"]: round(255 * (0.05 + 0.75 * (v / 255) ** k)))
    flat = Image.new("L", src.size, 255)
    flat.paste(gray, mask=a)
    x, y, w, *h = o["crop"]
    h = h[0] if h else w
    part = flat.crop((x, y, x + w, y + h)).resize((720, round(720 * h / w)), Image.LANCZOS)
    square = Image.new("L", (720, 720), 255)
    square.paste(part, (0, 720 - part.height))
    square.save(OUT / f"{name}-halftone.png")
    print(name, "→", OUT / f"{name}-halftone.png")

    # the plain photo for the hosts slide: same cut-out and crop, toned from the site's
    # navy ink (shadows) to a pale blue (highlights), background left transparent
    tone = ImageOps.autocontrast(src.convert("L"), cutoff=1, mask=a.point(lambda v: 255 if v > 128 else 0))
    tint = ImageOps.colorize(tone, black="#021093", white="#eef2ff", mid="#5b78e0").convert("RGBA")
    tint.putalpha(a.filter(ImageFilter.MinFilter(3)))  # pull the edge in 1px: no white fringe on dark
    part = tint.crop((x, y, x + w, y + h)).resize((720, round(720 * h / w)), Image.LANCZOS)
    square = Image.new("RGBA", (720, 720), (0, 0, 0, 0))
    square.paste(part, (0, 720 - part.height))
    square.save(OUT / f"{name}-tint.png")
    print(name, "→", OUT / f"{name}-tint.png")
