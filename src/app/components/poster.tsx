"use client";

// Print easter egg: cmd+p renders the page as a one-sheet save-the-date
// poster instead of the web layout. Hidden on screen; the `@media print`
// block at the end of globals.css hides everything else and shows this.
// Always prints light (navy on white) regardless of the on-screen theme.
// Copy mirrors the countdown and the FAQ; update it with the event cycle.

import { WOLF_COLS, WOLF_DOTS, WOLF_ROWS } from "./wolf-dots";

const SITE_URL = "design-show-and-tell.vercel.app";
const DATE_LINE = "late november 2026 · exact date soon";
const PLACE = "ljubljana";

// Dot radius at full ink, in cell units. Slightly over half a cell so the
// darkest dots fuse, like the shader does.
const MAX_R = 0.56;

function HalftoneWolf({ className }: { className?: string }) {
  const dots: React.ReactNode[] = [];
  for (let y = 0; y < WOLF_ROWS; y++) {
    for (let x = 0; x < WOLF_COLS; x++) {
      const ink = Number(WOLF_DOTS[y][x]);
      if (!ink) continue;
      dots.push(<circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={(ink / 9) * MAX_R} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${WOLF_COLS} ${WOLF_ROWS}`} className={className} fill="currentColor" aria-hidden="true">
      {dots}
    </svg>
  );
}

export function Poster() {
  return (
    <div className="poster" aria-hidden="true">
      <div className="poster-top">
        <span>design show &amp; tell</span>
        <span>{PLACE}</span>
      </div>

      <HalftoneWolf className="poster-wolf" />

      <div className="poster-mid">
        <p className="poster-date">{DATE_LINE}</p>
        <p className="poster-sub">live demos. new experiments. no slides.</p>
      </div>

      <div className="poster-bottom">
        <div>
          <p className="poster-cta">looking for speakers</p>
          <p className="poster-sub">5–10 minutes, live, no slides. finished or not.</p>
          <p className="poster-sub">exact date and venue announced to the list first.</p>
        </div>
        <div className="poster-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/qr.svg" alt="" width={120} height={120} />
          <span>{SITE_URL}</span>
        </div>
      </div>
    </div>
  );
}
