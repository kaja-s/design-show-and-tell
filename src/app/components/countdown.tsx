"use client";

import { useEffect, useState } from "react";

// Set to the next event's date (local time, no timezone suffix) when it's
// confirmed, e.g. `new Date("2026-11-26T18:00:00")`. While null, the slot
// shows dashes and the small save-the-date line appears beneath it.
const NEXT_EVENT: Date | null = null;

const SAVE_THE_DATE = "[late november 2026 | exact date soon]";
const PLACEHOLDER = "--D : --H : --M : --S";

// Tab title easter egg: while the tab is hidden the title becomes the slot's
// days + hours ("--d : --h · design show & tell"); on return it glitches for
// TITLE_GLITCH_MS and settles back to the plain title.
const BASE_TITLE = "design show & tell";
const TITLE_GLITCH_MS = 280;
const TITLE_GLYPHS = "-0123456789:·";

function titleSlot(slot: string) {
  return slot.split(" : ").slice(0, 2).join(" : ").toLowerCase();
}

function glitchTitle(text: string) {
  return Array.from(text)
    .map((ch) => (ch !== " " && Math.random() < 0.3 ? TITLE_GLYPHS[Math.floor(Math.random() * TITLE_GLYPHS.length)] : ch))
    .join("");
}

// Glitch on the slot: a ~250ms burst every 5s. Variants are CSS keyframes in
// the `cdg-*` block in globals.css, keyed off `data-glitch` on `.cd-slot`.
// Set to "off" to disable.
type Glitch = "off" | "slip" | "slice" | "flicker" | "jitter";
const GLITCH: Glitch = "slip";

function getTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function Countdown() {
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    if (!NEXT_EVENT) return;
    const target = NEXT_EVENT;
    const tick = () => setTime(getTimeLeft(target));
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  // The slot always shows the countdown format: live digits once a date is
  // set, dashes while it isn't (or before the first tick).
  const slot =
    NEXT_EVENT && time
      ? `${pad(time.days)}D : ${pad(time.hours)}H : ${pad(time.minutes)}M : ${pad(time.seconds)}S`
      : PLACEHOLDER;

  // Tab title: show the slot while hidden, glitch once on return.
  useEffect(() => {
    let settle: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      if (document.hidden) {
        document.title = `${titleSlot(slot)} · ${BASE_TITLE}`;
      } else if (document.title !== BASE_TITLE) {
        document.title = `${glitchTitle(titleSlot(slot))} · ${BASE_TITLE}`;
        settle = setTimeout(() => {
          document.title = BASE_TITLE;
        }, TITLE_GLITCH_MS);
      }
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => {
      document.removeEventListener("visibilitychange", apply);
      if (settle) clearTimeout(settle);
    };
  }, [slot]);

  return (
    <section className="mb-8 sm:mb-12">
      <div className="flex flex-col items-center gap-2">
        <span
          className="cd-slot relative font-['Monaco',monospace] text-lg sm:text-xl uppercase text-center"
          data-glitch={GLITCH === "off" ? undefined : GLITCH}
          data-text={slot}
        >
          {slot}
        </span>
        {!NEXT_EVENT && (
          <span className="text-xs opacity-30 text-center animate-fade-in">
            {SAVE_THE_DATE}
          </span>
        )}
      </div>
    </section>
  );
}
