"use client";

// ---------------------------------------------------------------------------
// What the homepage tv shows on its other channels (village-window.tsx turns
// the left knob through them): the intro slides, and "no signal". Plus the
// burst of static between channels.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { EVENT, HOSTS, SPONSOR, TIMELINE } from "../slides/deck";

export const CHANNELS = ["village", "big screen", "slides", "no signal"] as const;
export const CHANNEL_NOTES = [
  "",
  "live from the big screen at the event",
  "the slides from tonight's intro",
  "nothing on this channel. try another one",
];

const SLIDE_MS = 4500;

// The deck, shortened to fit a tv.
function slides() {
  return [
    <div key="title" className="flex flex-col gap-[2cqw]">
      <span className="village-title text-[8cqw] leading-none" style={{ textShadow: "none" }}>
        design show &amp; tell <span style={{ textTransform: "none" }}>{EVENT.edition}</span>
      </span>
      <span className="text-[3.2cqw] opacity-70">
        {EVENT.dateLabel} · {EVENT.venue}
      </span>
    </div>,
    <div key="hosts" className="flex flex-col gap-[2.5cqw]">
      <span className="text-[3cqw] opacity-60">your hosts</span>
      {HOSTS.map((h) => (
        <span key={h.name} className="flex flex-col">
          <span className="text-[5.5cqw] leading-tight">{h.name}</span>
          <span className="text-[3cqw] opacity-70">{h.role}</span>
        </span>
      ))}
    </div>,
    <div key="sponsor" className="flex flex-col gap-[2cqw]">
      <span className="text-[3cqw] opacity-60">thanks to</span>
      <span className="village-title text-[9cqw] leading-none" style={{ textShadow: "none" }}>
        {SPONSOR.name}
      </span>
    </div>,
    <div key="tonight" className="flex flex-col gap-[1.6cqw] w-full">
      <span className="text-[3cqw] opacity-60">tonight</span>
      {TIMELINE.map((s) => (
        <span key={s.at} className="flex gap-[3cqw] text-[3.6cqw] leading-snug">
          <span className="tabular-nums opacity-60 shrink-0">{s.at}</span>
          <span className="truncate">{s.title}</span>
        </span>
      ))}
    </div>,
    <div key="village" className="flex items-center gap-[5cqw]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/qr-village.svg" alt="" className="w-[24cqw] bg-white p-[1.5cqw]" />
      <span className="flex flex-col gap-[1.5cqw]">
        <span className="village-title text-[5.5cqw] leading-tight" style={{ textShadow: "none" }}>
          slovenian designer village
        </span>
        <span className="text-[3cqw] opacity-70">scan, make your villager, find someone you haven&apos;t met</span>
      </span>
    </div>,
  ];
}

export function TvSlides({ night }: { night: boolean }) {
  const [n, setN] = useState(0);
  const all = slides();
  useEffect(() => {
    const t = window.setInterval(() => setN((i) => (i + 1) % all.length), SLIDE_MS);
    return () => window.clearInterval(t);
  }, [all.length]);
  return (
    <div
      className={`absolute inset-0 grid place-items-center p-[7cqw] [container-type:inline-size] ${night ? "bg-[#040c2a] text-[#93c5fd]" : "bg-[#f4f4f4] text-[#021093]"}`}
      aria-label="the intro slides"
      role="img"
    >
      <div key={n} className="village-step w-full flex justify-start">
        {all[n]}
      </div>
      <span className="absolute right-[4cqw] bottom-[3cqw] text-[2.6cqw] tabular-nums opacity-50">
        {n + 1}/{all.length}
      </span>
    </div>
  );
}

// Grey snow on a small canvas, scaled up. `still` draws one frame (reduced motion).
export function Noise({ className = "", still = false }: { className?: string; still?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const img = g.createImageData(c.width, c.height);
    let raf = 0, last = 0;
    const frame = (now: number) => {
      if (!still) raf = requestAnimationFrame(frame);
      if (now - last < 50) return; // ~20fps is plenty for snow
      last = now;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 30 + Math.random() * 200;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v + 18;
        d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [still]);
  return <canvas ref={ref} width={160} height={120} aria-hidden="true" className={`absolute inset-0 size-full [image-rendering:pixelated] ${className}`} />;
}

export function NoSignal({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0" role="img" aria-label="no signal">
      <Noise still={reduced} />
      <span className="absolute inset-0 grid place-items-center">
        <span className="village-title bg-[#040c2a]/85 text-white px-4 py-2 text-xl" style={{ textShadow: "none" }}>
          no signal
        </span>
      </span>
    </div>
  );
}
