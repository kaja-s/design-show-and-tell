#!/usr/bin/env node
/**
 * A newsletter banner as a looping gif and a still png, 1200×328 (2× the 600px
 * email column), in the site's night or day theme.
 *
 *   <theme>-background.png  the banner without the wolf: a 2× screenshot of its
 *                           block on /banner with the wolf canvas hidden
 *   public/wolf.mp4         run through the halftone shader (the same maths as
 *                           shader-canvas.tsx / scripts/capture-shader.js) in the
 *                           theme's ink, over the theme's background
 *   → <theme>.gif           one howl (5s, 60 frames at 12fps), loops seamlessly
 *   → <theme>.png           the first frame (the howl), full colour, for places
 *                           that don't take a gif
 *
 * Usage (from the project root): node graphics/newsletter/render.js night|day|day-centered|day-wolf
 * Needs ffmpeg on PATH.
 */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DIR = __dirname;
// HALFTONE_INK for each theme (shader-canvas.tsx) and --background (globals.css), and
// where banner.tsx puts the wolf's canvas and how big, at 2× (night is inset
// 24px, day isn't; the wolf alone is bigger, with the same dot size)
const THEMES = {
  night: { ink: [0x93, 0xc5, 0xfd], bg: [0x04, 0x0c, 0x2a], x: 48, y: 42, size: 192, cells: 21 },
  day: { ink: [0x02, 0x10, 0x93], bg: [0xff, 0xff, 0xff], x: 0, y: 42, size: 192, cells: 21 },
  "day-centered": { ink: [0x02, 0x10, 0x93], bg: [0xff, 0xff, 0xff], x: 520, y: 42, size: 192, cells: 21 },
  "day-wolf": { ink: [0x02, 0x10, 0x93], bg: [0xff, 0xff, 0xff], x: 0, y: 40, size: 248, cells: 27 },
};
const theme = process.argv[2];
if (!THEMES[theme]) {
  console.error("usage: node graphics/newsletter/render.js night|day|day-centered|day-wolf");
  process.exit(1);
}
const { ink: INK, x: X, y: Y, size: SIZE, cells } = THEMES[theme];
const DOT = SIZE / cells;
const background = path.join(DIR, `${theme}-background.png`);
const out = path.join(DIR, `${theme}.gif`);
const still = path.join(DIR, `${theme}.png`);
// lossless rgb, so the background colours survive exactly (a yuv video shifts white to #fdfdfd)
const tmp = path.join(DIR, `.wolf-${theme}.mkv`);

const FPS = 24; // the video's rate
const GIF_FPS = 12; // every other frame: the howl is slow, and it halves the file
const ANGLE = 1.1868; // ~68°
const SIN = Math.sin(ANGLE);
const COS = Math.cos(ANGLE);

const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function frame(src) {
  // ink with the dot as alpha, so only the dots cover the background (and the
  // title block the wolf's feet overlap)
  const dst = Buffer.alloc(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const si = (py * SIZE + px) * 4;
      const di = (py * SIZE + px) * 4;
      const luma = (src[si] * 0.299 + src[si + 1] * 0.587 + src[si + 2] * 0.114) / 255;
      let v = 0;
      if (luma <= 0.85) {
        // gl_FragCoord: pixel centres, origin bottom-left
        const gx = px + 0.5;
        const gy = SIZE - py - 0.5;
        const rx = gx * COS - gy * SIN;
        const ry = gx * SIN + gy * COS;
        const cx = Math.floor(rx / DOT) * DOT + DOT / 2;
        const cy = Math.floor(ry / DOT) * DOT + DOT / 2;
        const r = (DOT / 2) * (1 - luma);
        v = smoothstep(r + 0.5, r - 0.5, Math.hypot(rx - cx, ry - cy));
      }
      dst[di] = INK[0];
      dst[di + 1] = INK[1];
      dst[di + 2] = INK[2];
      dst[di + 3] = Math.round(v * 255);
    }
  }
  return dst;
}

const decode = spawn("ffmpeg", ["-v", "error", "-i", path.join(ROOT, "public", "wolf.mp4"), "-vf", `scale=${SIZE}:${SIZE}:flags=lanczos`, "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"]);
const encode = spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-video_size", `${SIZE}x${SIZE}`, "-framerate", String(FPS), "-i", "pipe:0", "-c:v", "ffv1", "-pix_fmt", "bgra", tmp]);

const FRAME = SIZE * SIZE * 4;
let buf = Buffer.alloc(0);
let n = 0;
decode.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= FRAME) {
    encode.stdin.write(frame(buf.subarray(0, FRAME)));
    buf = buf.subarray(FRAME);
    process.stderr.write(`\rwolf frame ${++n}`);
  }
});
decode.stdout.on("end", () => encode.stdin.end());

encode.on("close", (code) => {
  process.stderr.write("\n");
  if (code !== 0) process.exit(code);
  // wolf over the background, then one shared palette for the whole loop; only the
  // changed rectangle is stored per frame, so the flat night costs almost nothing
  const filter =
    `[0:v][1:v]overlay=${X}:${Y}:shortest=1:format=rgb,fps=${GIF_FPS},split[a][b];` +
    `[a]palettegen=max_colors=24:stats_mode=full[p];` +
    `[b][p]paletteuse=dither=none:diff_mode=rectangle`;
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-loop", "1", "-framerate", String(FPS), "-i", background, "-i", tmp, "-filter_complex", filter, "-loop", "0", out], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  // the still: frame 0 over the background, no palette
  const p = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", background, "-i", tmp, "-filter_complex", `[0:v][1:v]overlay=${X}:${Y}:format=rgb,format=rgb24`, "-frames:v", "1", still], { stdio: "inherit" });
  fs.rmSync(tmp, { force: true });
  if (p.status !== 0) process.exit(p.status ?? 1);
  for (const f of [out, still]) console.log(`✓ ${path.relative(ROOT, f)} (${(fs.statSync(f).size / 1024).toFixed(0)} KB)`);
});
