"use client";

// ---------------------------------------------------------------------------
// The village at the end of the homepage, inside an old tv (about 70% of the
// viewport). It switches on as you scroll: the moment the tv appears, the
// whole set (bezel and all) is a wide, thin slit with rounded ends and a
// glowing band of scanlines across it; it opens vertically until the tv is
// centred, the glow fades, and the village is playable. The opening is a
// clip-path on a fixed-size tv, so the canvas never resizes. The engine only loads once the tv is
// near, so the hero and the page loader never wait for it.
// ---------------------------------------------------------------------------
import dynamic from "next/dynamic";
// import Link from "next/link"; // for the hidden "move in" link
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Keys, useCoarsePointer } from "../village/keys";
import { useTheme } from "../theme-provider";
import { CHANNELS, CHANNEL_NOTES, Noise, NoSignal, TvSlides } from "./tv-channels";

const VillageApp = dynamic(() => import("../village/village-app").then((m) => m.VillageApp), {
  ssr: false,
  loading: () => null,
});

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const readReduced = () => matchMedia(REDUCED).matches;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function VillageWindow() {
  const tv = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const crt = useRef<HTMLDivElement>(null);
  const feet = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [open, setOpen] = useState(false);
  const touch = useCoarsePointer();
  const { theme } = useTheme();
  // the knobs: left turns the channel, right switches day and night (until
  // turned, the tv follows the site theme)
  const [channel, setChannel] = useState(0);
  const [nightKnob, setNightKnob] = useState<boolean | null>(null);
  const night = nightKnob ?? theme === "dark";
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, () => false);
  // a burst of static between channels
  const [snow, setSnow] = useState(false);
  const snowTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(snowTimer.current), []);
  const turnChannel = () => {
    setChannel((c) => (c + 1) % CHANNELS.length);
    if (reduced) return;
    setSnow(true);
    window.clearTimeout(snowTimer.current);
    snowTimer.current = window.setTimeout(() => setSnow(false), 280);
  };
  const [dip, setDip] = useState(0);
  const turnNight = () => {
    setNightKnob(!night);
    setDip((d) => d + 1);
  };

  useEffect(() => {
    const el = tv.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let wasOpen = false;
    // once fully open it stays open until the tv drops back below the fold,
    // so stopping a little short of centre never leaves the clip on (which
    // would crop the bezel's rounded corners and outline)
    let latched = false;
    const update = () => {
      raf = 0;
      const el = tv.current, pic = picture.current, bd = body.current, scr = screen.current, glow = crt.current, ft = feet.current;
      if (!el || !pic || !bd || !scr || !glow || !ft) return;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      // 0 when the tv's middle (where the slit is) comes up past the bottom
      // edge, 1 when the tv is centred: the whole opening happens in view
      const mid = r.top + r.height / 2;
      const start = vh * 0.94, end = Math.min(vh * 0.5, vh - r.height / 2) + vh * 0.06;
      const p = clamp((start - mid) / Math.max(1, start - end));
      if (p >= 1) latched = true;
      else if (p <= 0) latched = false;
      const e = latched ? 1 : easeOut(clamp((p - 0.08) / 0.92));
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // no slit: the set fades in, already open
        bd.style.clipPath = "";
        bd.style.opacity = ft.style.opacity = String(e);
        glow.style.opacity = "0";
      } else if (e >= 0.97) {
        bd.style.clipPath = "";
        ft.style.opacity = "1";
        glow.style.opacity = "0";
      } else {
        // the slit is centred on the screen (not the body, which has a chin),
        // starts a little narrower than the set and widens as it opens
        const b = bd.getBoundingClientRect(), s = scr.getBoundingClientRect();
        const cy = s.top + s.height / 2 - b.top;
        const half = 7 + e * 30; // the slit's minimum half-height, px
        const top = Math.max(0, cy * (1 - e) - half), bottom = Math.max(0, (b.height - cy) * (1 - e) - half);
        const side = (1 - clamp(p * 5)) * 18;
        // rounded ends: a wide ellipse while it's a slit, easing into the bezel's own corners
        const radius = parseFloat(getComputedStyle(bd).borderTopLeftRadius) || 30;
        const rx = Math.round(b.width * 0.09 * (1 - e) + radius * e), ry = Math.round(14 * (1 - e) + radius * e);
        bd.style.clipPath = p < 0.02 ? "inset(50% 50%)" : `inset(${top}px ${side}% ${bottom}px ${side}% round ${rx}px / ${ry}px)`;
        bd.style.opacity = "";
        ft.style.opacity = String(clamp((e - 0.85) / 0.15));
        glow.style.opacity = String(1 - clamp(e * 1.4));
      }
      pic.style.filter = e < 1 ? `brightness(${1 + (1 - e) * 0.8})` : "";
      const isOpen = e > 0.98;
      if (isOpen !== wasOpen) {
        wasOpen = isOpen;
        setOpen(isOpen);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    // always night-blue, in both themes: the tv glows on a dark wall
    <section aria-labelledby="village-title" className="village-section relative z-10 bg-[#040c2a] text-[#93c5fd] min-h-svh px-2 py-4 sm:px-4 sm:py-6 flex flex-col items-center justify-center gap-3 sm:gap-5">
      <header className="flex flex-col items-center gap-2.5 sm:gap-3 text-center">
        <h2 id="village-title" className="village-title text-[22px] leading-[1.05] sm:text-[32px] text-white text-balance">
          slovenian designer village
        </h2>
        {/* hidden for now; bring back to let people move in from the homepage
        <Link
          href="/village/join"
          className="mt-0.5 inline-flex items-center gap-1.5 border border-[#93c5fd]/40 px-3 py-1.5 text-xs text-[#93c5fd] transition-[background-color,color,border-color,scale] duration-150 ease-out hover:bg-[#93c5fd] hover:text-[#040c2a] hover:border-[#93c5fd] active:scale-[0.97]"
        >
          move in →
        </Link>
        */}
      </header>

      <div ref={tv} className="relative">

        {/* phones: the set fills the screen (178px = padding, title, chin, feet and the key legend) */}
        <div ref={body} className="tv-body relative rounded-[24px] sm:rounded-[38px] p-2 pb-11 sm:p-5 sm:pb-14" style={{ clipPath: "inset(50% 50%)" }}>
          <div ref={screen} className="tv-screen relative overflow-hidden rounded-[16px] sm:rounded-[26px] w-[calc(100vw-32px)] h-[max(360px,calc(100svh-178px))] sm:h-auto sm:w-[min(64vw,calc((100svh-330px)*4/3))] sm:aspect-[4/3]">
            <div ref={picture} className={`absolute inset-0 text-foreground ${night ? "bg-[#16275e]" : "bg-[#f1f4fc]"}`}>
              <div key={dip} className={`absolute inset-0 ${dip && !reduced ? "tv-dip" : ""} ${open ? "" : "pointer-events-none"}`} inert={!open}>
                {near && channel < 2 && <VillageApp screen={channel === 1} me={null} inline active={open && channel === 0} night={night} />}
                {channel === 2 && <TvSlides night={night} />}
                {channel === 3 && <NoSignal reduced={reduced} />}
              </div>
              {snow && <Noise />}
            </div>
            {/* the warm-up glow: a soft colour band and heavy scanlines while it opens */}
            <div ref={crt} aria-hidden="true" className="tv-crt absolute inset-0 pointer-events-none" />
            <div aria-hidden="true" className="tv-glass absolute inset-0 pointer-events-none" />
          </div>
          {/* chin: name plate, speaker, knobs */}
          <div className="absolute inset-x-4 sm:inset-x-7 bottom-2 sm:bottom-4 h-7 flex items-center justify-between gap-4">
            <span aria-hidden="true" className="text-[10px] tracking-[0.2em] text-[#93c5fd]/80 tabular-nums">
              dst·tv <span className="opacity-70">ch{channel + 1}</span>
            </span>
            <span aria-hidden="true" className="tv-grille flex-1 h-3 max-w-40" />
            <span className="flex gap-2">
              {/* left: channel. The notch points at one of four stops. */}
              <button
                type="button"
                onClick={turnChannel}
                aria-label={`channel ${channel + 1}: ${CHANNELS[channel]}. turn to the next channel`}
                title={`ch${channel + 1} · ${CHANNELS[channel]}`}
                className="tv-knob-button hit relative rounded-full"
              >
                <span className="tv-knob block size-5 sm:size-6 rounded-full" style={{ rotate: `${-60 + channel * 40}deg` }} />
              </button>
              {/* right: day and night */}
              <button
                type="button"
                onClick={turnNight}
                aria-pressed={night}
                aria-label="night"
                title={night ? "night" : "day"}
                className="tv-knob-button hit relative rounded-full"
              >
                <span className="tv-knob block size-5 sm:size-6 rounded-full" style={{ rotate: night ? "45deg" : "-45deg" }} />
              </button>
            </span>
          </div>
        </div>
        {/* feet */}
        <div ref={feet} aria-hidden="true" className="flex justify-between px-[14%]" style={{ opacity: 0 }}>
          <span className="block w-8 h-2.5 rounded-b-md bg-[#0b1238]" />
          <span className="block w-8 h-2.5 rounded-b-md bg-[#0b1238]" />
        </div>
      </div>

      {channel === 0 ? (
        <Keys touch={touch} className="justify-center" />
      ) : (
        <p className="text-xs text-[#93c5fd]/80 text-center min-h-5" aria-live="polite">
          ch{channel + 1} · {CHANNEL_NOTES[channel]}
        </p>
      )}
    </section>
  );
}
