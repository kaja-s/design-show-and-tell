"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "../theme-provider";
import { ShaderCanvas, signalWolfReady } from "../components/shader-canvas";
import { HalftoneImage } from "./halftone-image";
import FeatherIcon from "feather-icons-react";
import { EVENT, FIRST_UP, HOSTS, SPONSOR, TIMELINE, VILLAGE, type Person } from "./deck";

// /slides: the intro deck for the projector. A fixed 1920×1080 stage scaled to
// fit the window, so the layout is identical on any screen.
//
//   → ↓ space pagedown enter   next (clickers send pagedown/pageup)
//   ← ↑ pageup backspace       previous
//   home / end                 first / last
//   f                          fullscreen
//   d                          day / night (same toggle as the site)
//   click                      right half next, left half previous
//
// The slide number lives in the hash (/slides#4) so a reload stays put.

const W = 1920;
const H = 1080;

const SLIDES = [TitleSlide, HostsSlide, SponsorSlide, TimelineSlide, VillageSlide, FirstUpSlide];

const NAV_EVENT = "slides:go";
function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(NAV_EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(NAV_EVENT, cb);
  };
}

function readHash() {
  const n = parseInt(window.location.hash.slice(1), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n - 1, 0), SLIDES.length - 1) : 0;
}

export default function Slides() {
  const { toggle } = useTheme();
  const index = useSyncExternalStore(subscribe, readHash, () => 0);
  const [scale, setScale] = useState(0);
  const [idle, setIdle] = useState(false);

  // start on the slide in the hash; there's no wolf to wait for past slide 1
  useEffect(() => {
    if (readHash() !== 0) signalWolfReady();
  }, []);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const go = useCallback((next: number) => {
    const i = Math.min(Math.max(next, 0), SLIDES.length - 1);
    history.replaceState(null, "", `#${i + 1}`);
    window.dispatchEvent(new Event(NAV_EVENT));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) go(index + 1);
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) go(index - 1);
      else if (k === "Home") go(0);
      else if (k === "End") go(SLIDES.length - 1);
      else if (k === "f") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      } else if (k === "d") toggle();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, toggle]);

  // hide the cursor while the deck is being presented
  useEffect(() => {
    let t = window.setTimeout(() => setIdle(true), 2000);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(t);
      t = window.setTimeout(() => setIdle(true), 2000);
    };
    window.addEventListener("pointermove", wake);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointermove", wake);
    };
  }, []);

  const Slide = SLIDES[index];

  return (
    <>
      <div
        className="noise fixed inset-0 pointer-events-none opacity-40"
        style={{ backgroundImage: "url(/noise.svg)", backgroundRepeat: "repeat", zIndex: 9999 }}
      />
      <main
        className={`fixed inset-0 overflow-hidden select-none ${idle ? "cursor-none" : ""}`}
        onClick={(e) => go(e.clientX > window.innerWidth / 2 ? index + 1 : index - 1)}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
        >
          {/* keyed so each slide's entrance replays when you land on it */}
          <section key={index} aria-roledescription="slide" aria-label={`${index + 1} of ${SLIDES.length}`} className="absolute inset-0 px-[120px] py-[104px]">
            <Slide />
          </section>

          {/* the cover already says all of this */}
          <footer
            className={`absolute inset-x-[120px] bottom-[48px] flex justify-between text-[22px] text-foreground-muted tabular-nums ${index === 0 ? "invisible" : ""}`}
            aria-hidden="true"
          >
            <span>
              design show & tell{" "}
              {/* a roman numeral: opt out of the global lowercase (which outranks a plain utility) */}
              <span className="normal-case!">{EVENT.edition}</span>
            </span>
            <span>
              {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
          </footer>
        </div>
      </main>
    </>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

/** The status-line label from the site and the social graphics: "> text" in a solid block. */
function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    // inline + cloned decoration: a wrapped label gets one block per line, hugging the text
    <span className={`bg-highlight text-highlight-text px-[0.3em] py-[0.04em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone] ${className}`}>
      <span aria-hidden="true">&gt; </span>
      {children}
    </span>
  );
}

// `cells` is dots across: ~55–65 keeps a face readable from the back row; small
// thumbnails need fewer so the dots don't turn to mush.
function Portrait({ person, size, cells }: { person: Person; size: number; cells: number }) {
  return person.photo ? (
    <HalftoneImage src={person.photo} cells={cells} className="block shrink-0" />
  ) : (
    <div
      className="shrink-0 grid place-items-center border-2 border-dashed border-foreground-muted text-foreground-muted"
      style={{ width: size, height: size, fontSize: size / 4 }}
    >
      {person.initials}
    </div>
  );
}

/* ── slides ─────────────────────────────────────────────────────────────── */

function TitleSlide() {
  return (
    // the site's centered hero, tightened: wolf, name, date. The small print sits in the corners.
    <div className="h-full relative flex flex-col items-center justify-center text-center">
      <p className="slide-in absolute top-0 left-0 text-[26px] text-foreground-muted">meetup for designers</p>
      <p className="slide-in absolute top-0 right-0 text-[26px] text-foreground-muted">
        no. <span className="normal-case!">{EVENT.edition}</span>
      </p>
      <ShaderCanvas className="slide-in relative size-[460px] -mt-[48px] shrink-0" cells={38} />
      <h1 className="slide-in [--d:100ms] text-[80px] leading-[1.15] font-bold tracking-[-0.02em] mt-[16px]">
        <Tag>design show &amp; tell</Tag>
      </h1>
      <p className="slide-in [--d:200ms] text-[40px] mt-[48px] tabular-nums">
        {EVENT.dateLabel} · {TIMELINE[0].at}
      </p>
    </div>
  );
}

function HostsSlide() {
  return (
    <div className="h-full flex flex-col">
      <h2 className="slide-in text-[56px] font-bold mb-[40px]">
        <Tag>hi, we&apos;re your hosts</Tag>
      </h2>
      <div className="slide-in [--d:100ms] grid grid-cols-2 gap-[96px] flex-1">
        {HOSTS.map((h) => (
          <div key={h.name} className="flex flex-col">
            {/* sources are framed so the ink reaches the left edge: portrait and text share one edge */}
            <div className="size-[400px] mb-[32px] [&>canvas]:size-full">
              <Portrait person={h} size={400} cells={60} />
            </div>
            <div className="max-w-[720px]">
              <p className="text-[48px] font-bold leading-tight">{h.name}</p>
              <p className="text-[30px] mt-[12px] text-foreground-muted">{h.role}</p>
              <p className="text-[30px] mt-[32px] leading-[1.4] text-pretty">{h.bio}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SponsorSlide() {
  return (
    <div className="slide-in h-full flex flex-col justify-center">
      <p className="text-[40px] text-foreground-muted mb-[24px]">thank you</p>
      <h2>
        <VisionectLogo className="block h-[150px] w-auto" />
        <span className="sr-only">{SPONSOR.name}</span>
      </h2>
    </div>
  );
}

function TimelineSlide() {
  const now = useNowSlot();
  return (
    <div className="h-full flex flex-col">
      <h2 className="slide-in text-[56px] font-bold mb-[56px]">
        <Tag>tonight</Tag>
      </h2>
      <ol className="slide-in [--d:100ms] flex flex-col gap-[20px]">
        {TIMELINE.map((s, i) => {
          const live = i === now;
          // the pin is "you are here": the running slot on the night, the first one otherwise
          const here = i === (now >= 0 ? now : 0);
          return (
            <li
              key={s.at}
              className={`grid grid-cols-[160px_1fr] items-center gap-x-[40px] px-[24px] py-[18px] -mx-[24px] ${
                live ? "bg-highlight text-highlight-text" : ""
              }`}
            >
              <span className="text-[40px] tabular-nums">{s.at}</span>
              <span>
                <span className="flex items-center gap-[20px] text-[40px] font-bold leading-tight">
                  {s.title}
                  {here && (
                    <>
                      <FeatherIcon icon="map-pin" size={36} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
                      <span className="sr-only">you are here</span>
                    </>
                  )}
                </span>
                {s.sub && (
                  <span className={`block text-[26px] mt-[4px] ${live ? "opacity-75" : "text-foreground-muted"}`}>{s.sub}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function VillageSlide() {
  const count = useVillagerCount();
  return (
    <div className="h-full grid grid-cols-[1fr_auto] gap-[120px] items-center">
      <div className="slide-in">
        <h2 className="text-[56px] leading-[1.15] font-bold whitespace-nowrap">
          <Tag>slovenian designer village</Tag>
        </h2>
        <ol className="mt-[64px] flex flex-col gap-[20px] text-[40px]">
          {VILLAGE.steps.map((step, i) => (
            <li key={step} className="flex gap-[28px]">
              <span className="text-foreground-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-[56px] text-[30px] text-foreground-muted tabular-nums h-[1.4em]">
          {count === null ? "" : count === 0 ? "nobody's moved in yet. be the first." : `${count} ${count === 1 ? "designer has" : "designers have"} moved in`}
        </p>
      </div>
      <figure className="slide-in [--d:200ms] flex flex-col items-center gap-[28px]">
        {/* always dark-on-white: scanners need the contrast and the quiet zone in both themes */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/qr-village.svg" alt={`qr code for ${VILLAGE.joinUrl}`} className="size-[520px] bg-white p-[28px]" />
        <figcaption className="text-[24px] text-foreground-muted whitespace-nowrap">{VILLAGE.joinUrl}</figcaption>
      </figure>
    </div>
  );
}

function FirstUpSlide() {
  return (
    <div className="h-full grid grid-cols-[1fr_auto] items-center gap-[80px]">
      <div className="slide-in">
        <p className="text-[40px] mb-[32px]">
          <Tag>up first</Tag>
        </p>
        <h2 className="text-[112px] leading-[1.02] font-bold tracking-[-0.03em] text-balance">{FIRST_UP.name}</h2>
        <p className="text-[36px] mt-[28px] text-foreground-muted">{FIRST_UP.role}</p>
        <p className="text-[44px] mt-[64px] leading-[1.3] max-w-[900px] text-pretty">“{FIRST_UP.talk}”</p>
      </div>
      <div className="slide-in [--d:200ms] size-[720px] -mr-[60px] [&>canvas]:size-full">
        <Portrait person={FIRST_UP} size={720} cells={70} />
      </div>
    </div>
  );
}

/* ── live data ──────────────────────────────────────────────────────────── */

/** Index of the timeline slot running right now; -1 outside the event. */
function useNowSlot() {
  const [slot, setSlot] = useState(-1);
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const at = (hhmm: string) => new Date(`${EVENT.day}T${hhmm}:00`).getTime();
      if (now < at(TIMELINE[0].at) || now >= at(EVENT.ends)) return setSlot(-1);
      setSlot(TIMELINE.findLastIndex((s) => now >= at(s.at)));
    };
    check();
    const t = window.setInterval(check, 30_000);
    return () => window.clearInterval(t);
  }, []);
  return slot;
}

/** How many villagers have moved in; polls while the slide is up. */
function useVillagerCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/villagers", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setCount(d.villagers.length))
        .catch(() => {});
    load();
    const t = window.setInterval(load, 5000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  return count;
}

/* ── sponsor logo ───────────────────────────────────────────────────────── */

// visionect wordmark, from visionect.com/…/brand/logo.svg, recolored to currentColor
// so it follows day/night with the rest of the ink.
function VisionectLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 183 32" fill="none" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.433 26.788l-7.15-21.51h1.595l3.798 11.52c1.051 3.127 1.915 5.844 2.522 8.235h.095c.64-2.424 1.629-5.204 2.746-8.235l4.178-11.52h1.63l-7.978 21.51h-1.436zM31.27 5.278h-1.498v21.51h1.498V5.278zm31.779-4.062h-1.504v26.127h1.504V1.216zM41.218 24.397a8.57 8.57 0 004.723 1.435c3.193 0 5.173-1.822 5.173-4.472 0-2.425-1.246-3.827-4.34-5.04-3.481-1.213-5.556-3.002-5.556-5.935 0-3.162 2.617-5.462 6.256-5.462 2.007 0 3.544.544 4.275 1.024l-.573 1.276c-.574-.411-1.947-1.022-3.798-1.022-3.477 0-4.659 2.237-4.659 3.928 0 2.391 1.37 3.609 4.468 4.815 3.542 1.437 5.424 3.033 5.424 6.257 0 3.128-2.233 5.935-6.828 5.935-1.851 0-4.022-.636-5.137-1.469l.572-1.27zm31.932-8.201c0 4.848 2.808 9.668 7.914 9.668s7.948-4.633 7.948-9.96c0-4.53-2.491-9.703-7.884-9.703-5.457 0-7.979 4.982-7.979 9.994m17.432-.385c0 7.599-4.63 11.328-9.61 11.328-5.299 0-9.383-4.18-9.383-10.881 0-7.055 4.244-11.332 9.641-11.332 5.422 0 9.352 4.215 9.352 10.885zm7.455 10.978V5.278h1.437l8.394 12.7c1.723 2.682 2.967 4.695 4.02 6.766l.06-.03c-.222-2.905-.249-5.363-.249-8.749V5.278h1.496v21.51h-1.434l-8.201-12.511c-1.597-2.491-3.064-4.757-4.183-6.957l-.063.033c.16 2.647.191 4.978.191 8.553v10.883h-1.468zm35.256-10.691h-8.615v9.415h9.637v1.277h-11.139V5.28H133.8v1.275h-9.123v8.268h8.615v1.275zm23.128 9.924c-1.084.574-3.159 1.116-5.777 1.116-5.201 0-10.181-3.35-10.181-10.976 0-6.384 4.12-11.237 10.885-11.237 2.742 0 4.34.609 5.009.96l-.509 1.276c-1.084-.543-2.649-.925-4.47-.925-5.807 0-9.349 3.764-9.349 9.96 0 5.836 3.351 9.605 9.093 9.605 1.853 0 3.642-.382 4.851-.989l.448 1.21zm13.478-19.466h-7.021V5.279h15.576v1.276h-7.024v20.233h-1.531V6.555z"
      />
    </svg>
  );
}
