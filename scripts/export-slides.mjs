#!/usr/bin/env node
/**
 * Saves the /slides deck as one PNG per slide plus a single PDF, a backup that opens
 * anywhere if the laptop or the browser lets you down on the night.
 *
 * Usage: node scripts/export-slides.mjs [origin] [--dark]
 *   origin  a running copy of the site (default http://localhost:3000)
 *   --dark  the night theme instead of the day one
 *
 * Writes to <tmp>/design-show-and-tell-slides/ and prints the path. Needs Google Chrome.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const dark = args.includes("--dark");
const origin = (args.find((a) => !a.startsWith("--")) || "http://localhost:3000").replace(/\/$/, "");
const theme = dark ? "dark" : "light";
const OUT = path.join(os.tmpdir(), "design-show-and-tell-slides");

try {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--hide-scrollbars", "--force-device-scale-factor=1"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument((t) => localStorage.setItem("theme", t), theme);

  await page.goto(`${origin}/slides#1`, { waitUntil: "networkidle0" });
  const total = await page.evaluate(() =>
    parseInt(document.querySelector("section").getAttribute("aria-label").split(" of ")[1], 10),
  );

  const files = [];
  for (let n = 1; n <= total; n++) {
    await page.evaluate((i) => (window.location.hash = String(i)), n);
    // let the entrance animations, images and the wolf's first frames settle
    await new Promise((r) => setTimeout(r, 1500));
    const file = path.join(OUT, `${theme}-${String(n).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    files.push(file);
    console.log(`slide ${n}/${total} → ${file}`);
  }

  // one page per slide, at the stage's own size
  const pages = files
    .map((f) => `<img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}">`)
    .join("");
  await page.setContent(
    `<style>@page{size:1920px 1080px;margin:0}body{margin:0}img{display:block;width:1920px;height:1080px;break-after:page}</style>${pages}`,
  );
  const pdf = path.join(OUT, `slides-${theme}.pdf`);
  await page.pdf({ path: pdf, width: "1920px", height: "1080px", printBackground: true });
  console.log(`\n${pdf}`);

  await browser.close();
} catch (err) {
  console.error(err);
  process.exit(1);
}
