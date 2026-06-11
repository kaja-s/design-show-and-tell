#!/usr/bin/env node
/**
 * Renders wolf.mp4 through the halftone WebGL shader (matching shader-canvas.tsx exactly)
 * and saves the result as wolf-shader.mp4 in the project root.
 *
 * Usage: node scripts/capture-shader.js
 */
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const wolfPath = path.join(ROOT, "public", "wolf.mp4");
const outputPath = path.join(ROOT, "wolf-shader.mp4");

// Render at 2x the website's canvas size (192→384) with proportionally scaled dot size.
// Dot density and visual appearance are identical to the live site.
const W = 384;
const H = 384;
const FRAME_SIZE = W * H * 4; // RGBA bytes per frame
const FPS = 24;

// Shader parameters — must match shader-canvas.tsx exactly
const DOT_SIZE = 10.0;   // 5.0 * 2 (scaled with resolution)
const ANGLE = 1.1868;    // ~68 degrees
const SIN_A = Math.sin(ANGLE);
const COS_A = Math.cos(ANGLE);

// Light mode colors (matching the website's light theme)
const NAVY_R = 2;   // #021093
const NAVY_G = 16;
const NAVY_B = 147;
const BG = 244; // #F4F4F4

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function processFrame(src) {
  // Output is rgb24 (3 bytes/pixel) — already composited onto background
  const out = Buffer.alloc(W * H * 3);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const si = (py * W + px) * 4;
      const di = (py * W + px) * 3;

      const r = src[si] / 255;
      const g = src[si + 1] / 255;
      const b = src[si + 2] / 255;
      const luma = r * 0.299 + g * 0.587 + b * 0.114;

      if (luma > 0.85) {
        out[di] = BG; out[di + 1] = BG; out[di + 2] = BG;
        continue;
      }

      // gl_FragCoord uses pixel centres with OpenGL's bottom-left Y origin
      const gx = px + 0.5;
      const gy = (H - py) - 0.5;

      const rx = gx * COS_A - gy * SIN_A;
      const ry = gx * SIN_A + gy * COS_A;

      const cx = Math.floor(rx / DOT_SIZE) * DOT_SIZE + DOT_SIZE * 0.5;
      const cy = Math.floor(ry / DOT_SIZE) * DOT_SIZE + DOT_SIZE * 0.5;

      const dist = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2);
      const radius = (DOT_SIZE * 0.5) * (1.0 - luma);

      // smoothstep with inverted edges → 1 inside dot, 0 outside
      const dotValue = smoothstep(radius + 0.5, radius - 0.5, dist);

      out[di]     = Math.round(NAVY_R * dotValue + BG * (1 - dotValue));
      out[di + 1] = Math.round(NAVY_G * dotValue + BG * (1 - dotValue));
      out[di + 2] = Math.round(NAVY_B * dotValue + BG * (1 - dotValue));
    }
  }

  return out;
}

// Decode wolf.mp4 → scaled RGBA frames
const decoder = spawn("ffmpeg", [
  "-i", wolfPath,
  "-vf", `scale=${W}:${H}`,
  "-f", "rawvideo",
  "-pix_fmt", "rgba",
  "pipe:1",
]);

// Encode processed RGB frames → H.264 MP4
const encoder = spawn("ffmpeg", [
  "-y",
  "-f", "rawvideo",
  "-pix_fmt", "rgb24",
  "-video_size", `${W}x${H}`,
  "-framerate", String(FPS),
  "-i", "pipe:0",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-crf", "18",
  outputPath,
]);

decoder.stderr.on("data", () => {});
encoder.stderr.on("data", () => {});

let buf = Buffer.alloc(0);
let frameCount = 0;

decoder.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= FRAME_SIZE) {
    const frame = buf.subarray(0, FRAME_SIZE);
    buf = buf.subarray(FRAME_SIZE);
    frameCount++;
    process.stderr.write(`\rProcessing frame ${frameCount}…`);
    encoder.stdin.write(processFrame(frame));
  }
});

decoder.stdout.on("end", () => {
  process.stderr.write(`\n`);
  encoder.stdin.end();
});

encoder.on("close", (code) => {
  if (code === 0) {
    console.log(`✓  Saved → ${outputPath}`);
  } else {
    process.stderr.write(`Encoder exited with code ${code}\n`);
    process.exit(1);
  }
});

decoder.on("error", (e) => { console.error("Decoder:", e.message); process.exit(1); });
encoder.on("error", (e) => { console.error("Encoder:", e.message); process.exit(1); });
