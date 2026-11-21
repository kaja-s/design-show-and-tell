# graphics

Looping motion graphics for social posts. One shared engine, one small folder per graphic:

```
graphics/
  _engine/
    comp.html        the composition: halftone shader + typography + pointer choreography,
                     every frame a pure function of time; loads ../<graphic>/content.js
    render.js        renders comp.html for one graphic through headless Chrome → mp4
    fonts/           Geist Mono (latin + latin-ext), vendored so renders don't need the network
  event/
    content.js       meetup announcement: copy, wolf framing, layout options
  speaker-nika/
    content.js       speaker announcement: halftones a still portrait instead of the wolf
    nika.png         original photo
    prepare.py       cut-out portrait → nika-halftone.png (square, grayscale on white)
    nika-halftone.png
    aikido.svg       logo for the byline (inlined into content.js)
  speaker-nina/
    content.js       speaker announcement: still portrait + Canonical logo in the role line
    nina.jpg         original photo (1200×1600)
    nina-cutout.png  nina.jpg with the background removed (macOS Vision subject lifting)
    prepare.py       cut-out → nina-halftone.png; scaled so her hair bleeds off the left edge,
                     only the photo's right edge fades out
    nina-halftone.png
    canonical.svg    Canonical logo, one colour: tag and wordmark in currentColor, the circle of
                     friends cut out in --hl (inlined into content.js; `css` there sizes it and
                     tightens the role line so the tag has equal insets)
```

The static designs live in the Paper file "design show&tell" (frames "join us" and "nika"); the
content.js files mirror their positions and copy.

## render

Needs Google Chrome installed and `ffmpeg` on PATH. Run from the project root:

```bash
node graphics/_engine/render.js event                  # → graphics/event/event.mp4
node graphics/_engine/render.js speaker-nika           # → graphics/speaker-nika/speaker nika.mp4
node graphics/_engine/render.js speaker-nina           # → graphics/speaker-nina/speaker nina.mp4
node graphics/_engine/render.js speaker-nika --stills  # key frames as PNGs for review → scratch/stills
```

Output is 1080×1080, 24fps, H.264, 12s, and loops seamlessly (first and last frame are identical).
The halftone resolves in, the text types on, then the pointer clicks the moon toggle into dark mode
and back.

## preview

Open `graphics/_engine/comp.html?graphic=event` in a browser and it plays in real time.
(Chrome needs `--allow-file-access-from-files` for the video to load from `file://`, or serve the repo
with any static server.)

## content.js options

- `content`: `label` (top-left status line), `sub` (date line), `cmd` (the big line, typed after `> `),
  `out` (the line under it; `{logo}` is replaced by `logo`, inline SVG using `currentColor`), and
  optionally `talk`. An empty `label` / `corner` / `out` hides that slot.
- `file`, `duration`, `timeline` (keys and defaults are the `T` object in `comp.html`, in seconds).
- `framing: { scale, push, offX, offY }` places the halftone source; `image` (a file in the graphic's
  folder) halftones that still instead of the wolf video; `dot` is the final cell size (default 14).
- `blockStyle: "highlight"`: text in solid blocks (`--highlight` / `--highlight-text`, inverting in
  dark mode), right-aligned; `block: { right, top | bottom }` anchors them.
- `toggle: { right, top, size }` moves and sizes the theme icon.
- `subInline: true` puts `label | sub` on one row; `labelCursor: true` keeps the cursor on the status
  line once the title has typed.
- `rows: [{ kind: "title" | "byline", text, prompt?, tail?, lineHeight? }]` replaces `cmd`/`out`/`talk`
  with free-form lines (used by `speaker-nika-talk`). Each row's slot is fixed to its final width so the
  right edges line up, and the fill grows left to right as it types; one cursor travels through them.
  `rowSpeed` / `bylineSpeed` (seconds per character) and `rowGap` tune the pace.
- `wolfIn: false`: no reveal or dissolve; the wolf is fully there from frame 0, howling, and the video is
  stretched to a whole number of howls per loop (the push-in is off too, so the loop doesn't jump).
- `still: true`: only the theme switch moves; text and halftone are in place from the first frame
  (no typing, cursors, push-in, sway or closing dissolve). `css` adds per-graphic style rules.
- `lightBg: [top, bottom]` swaps the light theme's page gradient; `keepCase: true` keeps capitals.

## add a speaker

Copy `speaker-nika/`, swap the copy, logo and photo. The image must be square and grayscale on white,
because the shader drops near-white pixels: cut the person out of the background first (macOS Vision
subject lifting, or any background remover), then adjust the face position and scale in `prepare.py`.
Faces need more contrast than the wolf to survive the dots, which is what the gamma and unsharp mask
there are for. Re-tune `framing` so the head clears the status line. If the photo is cropped tight, scale
it up so its edges bleed off the post rather than ending inside it (see `speaker-nina/prepare.py`).

## host portraits

`hosts/` isn't a graphic: it makes the host photos for the `/slides` hosts slide. Each host has an
original photo (`<name>.jpg`) and a cut-out (`<name>-cutout.png`, made with `swift hosts/lift.swift
hosts/<name>.jpg hosts/<name>-cutout.png`, macOS Vision subject lifting). `python3 hosts/prepare.py`
turns the cut-outs into `public/slides/<name>-tint.png` (the blue-toned photo the slide shows) and
`<name>-halftone.png`; each host's crop and tone curve live at the top of that file.

Change `_engine/comp.html` only for new choreography. Its shader math mirrors
`src/app/components/shader-canvas.tsx`; if the site's halftone or theme colours change, update `THEME`
and the fragment shader there too.

## newsletter banner

`graphics/newsletter/{night,day}.{gif,png}` are the email header in the site's dark and light themes: 1200×328
(2× a 600×164 banner in the email column), the halftone wolf howling on top of the title block. Day has no side
inset, so its text lines up with the email's body text; night is a dark block with a 24px inset.
`day-centered` is the light one with everything centred (`<Banner centered />`), `day-wolf` just the wolf, at the left
edge (`<WolfBanner />`). Their source is the page
`/banner` (`src/app/banner/banner.tsx`, both themes stacked). To change the copy and re-render:

1. Edit `banner.tsx`, open `/banner` with the dev server running at device pixel ratio 2, hide the wolves
   (`document.querySelectorAll('[data-banner] canvas').forEach(c => c.style.visibility = 'hidden')`) and save
   each banner's 1200×328 block as `graphics/newsletter/<theme>-background.png`.
2. `node graphics/newsletter/render.js night` (or `day`, `day-centered`, `day-wolf`) runs `public/wolf.mp4` through the halftone shader
   (CPU port, the same maths as `shader-canvas.tsx`) in the theme's ink over that background → `<theme>.gif`
   (12fps, 24 colours, ~170KB) and `<theme>.png` (the first frame, full colour, ~40KB). The wolf is composited
   with transparency, so its feet overlap the title block cleanly. Keep the wolf's size and per-theme position
   (`THEMES` in the script, at 2×) in step with `banner.tsx`.
