"use client";

// Easter egg: prints a halftone wolf and the speaker ask to the devtools
// console once per page load. Designers who inspect the page are exactly the
// people we want proposing a demo.

import { useEffect } from "react";
import { WOLF_DOTS } from "./wolf-dots";

const ORGANIZER_EMAIL = "kaja.skerlj@gmail.com";

// Ink ramp, light → dark. Two dot rows per text line so the aspect stays right
// in a monospace console.
const RAMP = " .:-=+*#%@";

function asciiWolf() {
  const lines: string[] = [];
  for (let y = 0; y < WOLF_DOTS.length; y += 2) {
    const a = WOLF_DOTS[y];
    const b = WOLF_DOTS[y + 1] ?? "0".repeat(a.length);
    let line = "";
    for (let x = 0; x < a.length; x++) {
      const ink = Math.round((Number(a[x]) + Number(b[x])) / 2);
      line += RAMP[Math.min(RAMP.length - 1, ink)];
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
}

let printed = false;

export function ConsoleWolf() {
  useEffect(() => {
    if (printed) return;
    printed = true;
    const mono = "font-family: Monaco, 'Geist Mono', monospace; line-height: 1.05; color: #3b5bdb;";
    const text = "font-family: Monaco, 'Geist Mono', monospace; color: #021093;";
    const dim = "font-family: Monaco, 'Geist Mono', monospace; color: #021093; opacity: .6;";
    console.log(
      `%c${asciiWolf()}\n\n%cdesign show & tell — looking for speakers\n%cten minutes, live, no slides. half-finished is perfect.\n%cpropose a demo: mailto:${ORGANIZER_EMAIL}\n\n%cpsst: double-click a photo. try cmd+p.`,
      mono,
      `${text} font-weight: bold;`,
      text,
      text,
      dim
    );
  }, []);
  return null;
}
