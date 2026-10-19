# graphics

Looping motion graphics for social posts. One shared engine, one small folder per graphic:

```
graphics/
  _engine/
    comp.html        the composition: halftone wolf shader + typography + pointer choreography,
                     every frame a pure function of time; loads ../<graphic>/content.js
    render.js        renders comp.html for one graphic through headless Chrome → mp4
    fonts/           Geist Mono (latin + latin-ext), vendored so renders don't need the network
  call-for-speakers/
    content.js       copy, duration, wolf framing, timeline overrides
    call for speakers.mp4
  save-the-date/
    content.js
    save the date.mp4
  speaker-nika/
    content.js       halftones a still portrait instead of the wolf
    nika.png         original photo
    prepare.py       cut-out portrait → nika-halftone.png (square, grayscale on white)
    nika-halftone.png
    speaker nika.mp4
```

## render

Needs Google Chrome installed and `ffmpeg` on PATH. Run from the project root:

```bash
node graphics/_engine/render.js call-for-speakers            # → graphics/call-for-speakers/call for speakers.mp4
node graphics/_engine/render.js save-the-date                # → graphics/save-the-date/save the date.mp4
node graphics/_engine/render.js save-the-date --stills       # key frames as PNGs for review → scratch/stills
node graphics/_engine/render.js save-the-date --variant a    # alternative wolf framing (VARIANTS in comp.html)
```

Output is 1080×1080, 24fps, H.264, 12s, and loops seamlessly (first and last frame are identical).

## preview

Open `graphics/_engine/comp.html?graphic=save-the-date` in a browser and it plays in real time.
(Chrome needs `--allow-file-access-from-files` for the video to load from `file://`, or serve the repo
with any static server.)

## add a new graphic

1. `mkdir graphics/<name>` and add a `content.js` (copy one of the existing ones). The folder name is
   what you pass to `render.js`; `file` inside it is the output file name.
2. Edit `content.content` (the copy; keep it lowercase like the site), `duration`, `variant`
   (`a` = full figure on the left, `b` = full-bleed head top-centre) and, if the beats need to move,
   `timeline` (keys and defaults are the `T` object in `comp.html`, in seconds).
3. Render. Nothing in `_engine/` needs to change for new copy.

For a speaker announcement, set `image` (a file in the graphic's folder) and the shader halftones that
still instead of the wolf video; `framing` (`{ scale, push, offX, offY }`, like `VARIANTS`) replaces
`variant`. Optional `content.sub` types a second line under the label (date · venue), and `blockLeft`
(px) moves the bottom block left when a long name doesn't fit from the default 346px. `{logo}` in
`content.out` is replaced by `logo` (inline SVG markup with `fill="currentColor"`, so it takes the text
colour in both themes); it types as one character and pops in. Optional `content.talk` adds a talk title under the output line;
with it, the output line drops to a small muted byline (name → talk → byline in visual weight). The image must be square and grayscale on white, because the shader drops near-white pixels:
cut the person out of the background first (macOS Vision subject lifting, or any background remover),
then copy `speaker-nika/prepare.py` and adjust its face position and scale. Faces need more contrast
than the wolf to survive 14px dots, which is what the gamma and unsharp mask there are for.

Change `_engine/comp.html` only for new choreography. Its shader math mirrors
`src/app/components/shader-canvas.tsx`; if the site's halftone or theme colours change, update `THEME`
and the fragment shader there too.
