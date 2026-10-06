#!/usr/bin/env node
/**
 * Renders comp.html (next to this file) for one graphic, frame by frame through headless
 * Chrome, and encodes the result as an mp4 (1080×1080, 24fps, seamless loop) in that graphic's folder.
 *
 * Usage (from the project root):
 *   node graphics/_engine/render.js call-for-speakers              # → graphics/call-for-speakers/<file>.mp4
 *   node graphics/_engine/render.js save-the-date --variant a      # alternative wolf framing
 *   node graphics/_engine/render.js call-for-speakers --stills     # key frames as PNGs → scratch/stills
 *   CHROME_PATH=/path/to/chrome node graphics/_engine/render.js <name>
 *
 * Needs: Google Chrome (or Chromium) installed, ffmpeg on PATH, puppeteer-core (devDependency).
 * Open comp.html directly in a browser to preview the animation in real time.
 */
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer-core");

const ROOT = path.join(__dirname, "..", "..");
const COMP = path.join(__dirname, "comp.html");
const GRAPHICS_DIR = path.join(__dirname, "..");
const NAME = process.argv.slice(2).find((a) => !a.startsWith("--") && !/^[ab]$/.test(a));
if (!NAME || !fs.existsSync(path.join(GRAPHICS_DIR, NAME, "content.js"))) {
  const available = fs.readdirSync(GRAPHICS_DIR).filter((d) => fs.existsSync(path.join(GRAPHICS_DIR, d, "content.js")));
  console.error(`usage: node graphics/_engine/render.js <graphic> [--variant a|b] [--stills]\navailable: ${available.join(", ")}`);
  process.exit(1);
}
const variantArg = process.argv.indexOf("--variant");
const VARIANT = variantArg > -1 ? process.argv[variantArg + 1] : "";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const W = 1080, H = 1080, FPS = 24;

const stillsMode = process.argv.includes("--stills");
const stillTimes = (process.env.STILLS || "0.8,2.0,3.2,5.6,6.2,6.6,6.75,7.0,7.9,9.9")
  .split(",").map(Number);

// headless Chrome very occasionally hands back a blank (solid black) frame; a solid
// 1080² png is a few KB, a real frame is hundreds — retry when it looks blank.
async function shoot(page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } });
    if (png.length > 30000) return png;
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new Error("screenshot kept coming back blank");
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--allow-file-access-from-files",
      "--autoplay-policy=no-user-gesture-required",
      "--ignore-gpu-blocklist",
      "--enable-unsafe-swiftshader",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });

  await page.goto("file://" + COMP + "?graphic=" + NAME + (VARIANT ? "&variant=" + VARIANT : ""), { waitUntil: "load" });
  await page.evaluate(() => window.compReady());
  const G = await page.evaluate(() => ({ file: window.GRAPHIC.file, duration: window.GRAPHIC.duration }));
  const DURATION = G.duration || 12;
  const TOTAL = FPS * DURATION;
  const OUT = process.env.OUT || path.join(GRAPHICS_DIR, NAME, `${G.file || NAME}${VARIANT ? "-" + VARIANT : ""}.mp4`);

  if (stillsMode) {
    const dir = process.env.STILLS_DIR || path.join(ROOT, "scratch", "stills");
    fs.mkdirSync(dir, { recursive: true });
    for (const t of stillTimes) {
      await page.evaluate((f, fps) => window.renderFrame(f, fps), Math.round(t * FPS), FPS);
      const file = path.join(dir, `t${t.toFixed(2)}.png`);
      await page.screenshot({ path: file, type: "png", clip: { x: 0, y: 0, width: W, height: H } });
      process.stdout.write(`still ${t.toFixed(2)}s → ${file}\n`);
    }
    await browser.close();
    return;
  }

  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "pipe:0",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-r", String(FPS), OUT,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  const started = Date.now();
  for (let f = 0; f < TOTAL; f++) {
    await page.evaluate((i, fps) => window.renderFrame(i, fps), f, FPS);
    const png = await shoot(page);
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (f % FPS === 0 || f === TOTAL - 1) {
      process.stderr.write(`\rframe ${f + 1}/${TOTAL}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    }
  }
  process.stderr.write("\n");
  ffmpeg.stdin.end();
  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  await browser.close();
  console.log(`✓  Saved → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
