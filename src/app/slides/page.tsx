"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "../theme-provider";
import { ShaderCanvas, signalWolfReady } from "../components/shader-canvas";
import { HalftoneImage } from "./halftone-image";
import FeatherIcon from "feather-icons-react";
import { EVENT, HOSTS, SPEAKERS, SPONSOR, TIMELINE, VILLAGE, type Person } from "./deck";

// /slides: the intro deck for the projector. A fixed 1920×1080 stage scaled to
// fit the window, so the layout is identical on any screen.
//
//   → ↓ space pagedown enter   next (clickers send pagedown/pageup)
//   ← ↑ pageup backspace       previous
//   home / end                 first / last
//   1–9                        that slide (e.g. back to an intro after a talk)
//   f                          fullscreen
//   d                          day / night (same toggle as the site)
//   click                      right half next, left half previous
//
// The slide number lives in the hash (/slides#4) so a reload stays put.

const W = 1920;
const H = 1080;

// one intro per talk, in running order: the first comes straight after the village, the
// others go up between talks
const SPEAKER_SLIDES = SPEAKERS.map((person, i) => {
  const Intro = () => <SpeakerSlide person={person} label={i === 0 ? "up first" : "up next"} />;
  Intro.displayName = `SpeakerSlide(${person.initials})`;
  return Intro;
});

const SLIDES = [TitleSlide, HostsSlide, SponsorSlide, TimelineSlide, VillageSlide, ...SPEAKER_SLIDES, ClosingSlide];

const PRELOAD = [
  ...[...HOSTS, ...SPEAKERS].flatMap((p) => (p.photo ? [p.photo] : [])),
  "/qr-village.svg",
];
const PRELOADED: HTMLImageElement[] = [];

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

  // only the current slide renders, so fetch every slide's images now and keep them: a later
  // slide still has its photos and qr codes if the venue wifi drops mid-deck
  useEffect(() => {
    PRELOADED.push(
      ...PRELOAD.map((src) => {
        const img = new Image();
        img.src = src;
        return img;
      }),
    );
  }, []);

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
      else if (/^[1-9]$/.test(k)) go(Number(k) - 1);
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
            className={`absolute inset-x-[120px] bottom-[48px] flex justify-between text-[22px] text-foreground-muted tabular-nums ${index === 0 || index === SLIDES.length - 1 ? "invisible" : ""}`}
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

/** The cover; `qr` adds the village code in the bottom-right corner (the closing slide). */
function TitleSlide({ qr = false }: { qr?: boolean }) {
  return (
    // the site's centered hero, tightened: wolf, name, date. The small print sits in the corners.
    <div className="h-full relative flex flex-col items-center justify-center text-center">
      <p className="slide-in absolute -top-[56px] left-0 text-[26px] text-foreground-muted">
        <span className="inline-block">meetup for designers</span>
      </p>
      <p className="slide-in absolute -top-[56px] right-0 text-[26px] text-foreground-muted">
        <span className="inline-block">
          no. <span className="normal-case!">{EVENT.edition}</span>
        </span>
      </p>
      <ShaderCanvas className="slide-in relative size-[360px] -mt-[48px] shrink-0" cells={38} />
      <h1 className="slide-in [--d:100ms] text-[80px] leading-[1.15] font-bold tracking-[-0.02em] mt-[16px]">
        <Tag>design show &amp; tell</Tag>
      </h1>
      <p className="slide-in [--d:200ms] text-[32px] mt-[24px] tabular-nums">
        <span className="inline-block">{EVENT.dateLabel}</span>
      </p>
      {qr && (
        <figure className="slide-in [--d:300ms] absolute -bottom-[40px] right-0 flex flex-col items-center gap-[16px]">
          {/* always dark-on-white: scanners need the contrast and the quiet zone in both themes */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/qr-village.svg" alt={`qr code for ${VILLAGE.joinUrl}`} className="size-[260px] bg-white p-[18px] outline outline-black/10 dark:outline-white/10" />
          <figcaption className="text-[22px] text-foreground-muted whitespace-nowrap">join the village</figcaption>
        </figure>
      )}
    </div>
  );
}

/* Host card variants, to pick one before the event: /slides?hosts=a…d#2, or press `v`
   on slide 2 to cycle. c is the default; a is the earlier card. */
const HOST_CARDS = ["a", "b", "c", "d"] as const;
type HostCard = (typeof HOST_CARDS)[number];
const HOSTS_EVENT = "hosts:change";

function readHostCard(): HostCard {
  const v = new URLSearchParams(window.location.search).get("hosts");
  return (HOST_CARDS as readonly string[]).includes(v ?? "") ? (v as HostCard) : "c";
}
function subscribeHostCard(cb: () => void) {
  window.addEventListener(HOSTS_EVENT, cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener(HOSTS_EVENT, cb);
    window.removeEventListener("popstate", cb);
  };
}

function CompanyLogo({ person, className }: { person: Person; className: string }) {
  if (!person.company) return null;
  return (
    <>
      {person.company === "codeplain" ? (
        <CodeplainLogo className={`block w-auto ${className}`} />
      ) : (
        <VisionectLogo className={`block w-auto ${className}`} />
      )}
      <span className="sr-only">{person.company}</span>
    </>
  );
}

function HostPhoto({ person }: { person: Person }) {
  return (
    <div className="relative size-[400px] mb-[32px]">
      {person.photo ? (
        // a plain photo toned blue (graphics/hosts/prepare.py), not the halftone; anchored
        // bottom-left so a larger one grows upward and still sits on the name
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photo}
          alt=""
          className="absolute bottom-0 block max-w-none"
          style={{ left: person.photoShiftX ?? 0, width: person.photoSize ?? 400, height: person.photoSize ?? 400 }}
        />
      ) : (
        <Portrait person={person} size={400} cells={60} />
      )}
    </div>
  );
}

/** a: name, muted role, logo, bio at body size (the current card). */
function HostCardA({ h }: { h: Person }) {
  return (
    <div className="max-w-[720px]">
      <p className="text-[48px] font-bold leading-tight"><Tag>{h.name}</Tag></p>
      <p className="text-[30px] mt-[12px] text-foreground-muted">{h.role}</p>
      <p className="mt-[20px] [--logo-h:34px]">
        <CompanyLogo person={h} className="h-[var(--logo-h)]" />
      </p>
      <p className="text-[24px] mt-[32px] leading-[1.45] text-pretty">{h.bio}</p>
    </div>
  );
}

/** b: the company is a small label above the name; role sits tight under it; bio steps down. */
function HostCardB({ h }: { h: Person }) {
  return (
    <div className="max-w-[720px]">
      <p className="[--logo-h:28px] text-foreground-muted">
        <CompanyLogo person={h} className="h-[var(--logo-h)]" />
      </p>
      <p className="text-[52px] font-bold leading-tight mt-[20px]"><Tag>{h.name}</Tag></p>
      <p className="text-[32px] mt-[6px]">{h.role}</p>
      <p className="text-[22px] mt-[28px] leading-[1.45] text-foreground-muted text-pretty max-w-[600px]">{h.bio}</p>
    </div>
  );
}

/** c: name, then one line "role at <logo>", then the bio. */
function HostCardC({ h }: { h: Person }) {
  return (
    <div className="max-w-[720px]">
      <p className="text-[52px] font-bold leading-tight"><Tag>{h.name}</Tag></p>
      <p className="text-[30px] mt-[10px] flex items-baseline gap-[14px] flex-wrap [--logo-h:30px]">
        <span>{h.role} at</span>
        <span className="self-center translate-y-[2px]">
          <CompanyLogo person={h} className="h-[var(--logo-h)]" />
        </span>
      </p>
      <p className="text-[24px] mt-[28px] leading-[1.45] text-foreground-muted text-pretty max-w-[620px]">{h.bio}</p>
    </div>
  );
}

/** d: name, role, bio; the logo signs off under a rule, level across both cards. */
function HostCardD({ h }: { h: Person }) {
  return (
    <div className="max-w-[640px] flex-1 flex flex-col">
      <p className="text-[52px] font-bold leading-tight"><Tag>{h.name}</Tag></p>
      <p className="text-[30px] mt-[8px] text-foreground-muted">{h.role}</p>
      <p className="text-[24px] mt-[28px] leading-[1.45] text-pretty">{h.bio}</p>
      <p className="mt-auto pt-[24px] border-t-2 border-foreground/20 [--logo-h:30px]">
        <CompanyLogo person={h} className="h-[var(--logo-h)]" />
      </p>
    </div>
  );
}

function HostsSlide() {
  const card = useSyncExternalStore(subscribeHostCard, readHostCard, () => "c" as HostCard);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "v" || e.metaKey || e.ctrlKey || e.altKey) return;
      const next = HOST_CARDS[(HOST_CARDS.indexOf(readHostCard()) + 1) % HOST_CARDS.length];
      const url = new URL(window.location.href);
      url.searchParams.set("hosts", next);
      window.history.replaceState(null, "", url);
      window.dispatchEvent(new Event(HOSTS_EVENT));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const Card = { a: HostCardA, b: HostCardB, c: HostCardC, d: HostCardD }[card];
  return (
    <div className="h-full flex flex-col">
      {/* a caption, not a heading: the names carry the fill on this slide */}
      <h2 className="slide-in text-[30px] text-foreground-muted">
        <span className="inline-block">by designers, for designers</span>
      </h2>
      {/* keyed so switching replays the entrance */}
      <div key={card} className="slide-in [--d:100ms] grid grid-cols-2 gap-x-[96px] content-center flex-1 pb-[48px]">
        {HOSTS.map((h) => (
          <div key={h.name} className="flex flex-col">
            <HostPhoto person={h} />
            <Card h={h} />
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
        <Tag>agenda</Tag>
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
                  <span className={`block text-[30px] mt-[6px] text-pretty ${live ? "opacity-75" : "text-foreground-muted"}`}>{s.sub}</span>
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
  const villagers = useVillagers();
  const count = villagers ? villagers.length : null;
  const newest = villagers ? villagers.slice(-4).reverse() : [];
  return (
    <div className="h-full grid grid-cols-[1fr_auto] gap-[120px] items-center">
      <div className="slide-in">
        <h2 className="text-[56px] leading-[1.15] font-bold whitespace-nowrap">
          <Tag>slovenska dizajnerska vas</Tag>
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
          {count === null ? "" : count === 0 ? "nihče se še ni vselil. bodi prvi." : movedIn(count)}
        </p>
        {/* the newest arrivals, newest first; keyed by id so only a new name plays the entrance */}
        <p className="slide-in mt-[16px] h-[1.4em] flex items-baseline gap-[28px] text-[30px] whitespace-nowrap overflow-hidden max-w-[980px]">
          {newest.map((v, i) =>
            i === 0 ? (
              <span key={v.id} className="font-bold">
                <Tag>{v.name}</Tag>
              </span>
            ) : (
              <span key={v.id} className="text-foreground-muted">
                {v.name}
              </span>
            ),
          )}
        </p>
      </div>
      <figure className="slide-in [--d:200ms] flex flex-col items-center gap-[28px]">
        {/* always dark-on-white: scanners need the contrast and the quiet zone in both themes */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/qr-village.svg" alt={`qr code for ${VILLAGE.joinUrl}`} className="size-[520px] bg-white p-[28px] outline outline-black/10 dark:outline-white/10" />
        <figcaption className="text-[24px] text-foreground-muted whitespace-nowrap">{VILLAGE.joinUrl}</figcaption>
      </figure>
    </div>
  );
}

/** "n designers have moved in" in slovenian: singular, dual, 3–4, 5+ (by the last two digits). */
function movedIn(n: number) {
  const m = n % 100;
  if (m === 1) return `${n} dizajner se je vselil`;
  if (m === 2) return `${n} dizajnerja sta se vselila`;
  if (m === 3 || m === 4) return `${n} dizajnerji so se vselili`;
  return `${n} dizajnerjev se je vselilo`;
}

function SpeakerSlide({ person, label }: { person: Person; label: string }) {
  return (
    <div className="h-full grid grid-cols-[1fr_auto] items-center gap-[80px]">
      <div className="slide-in">
        <p className="text-[40px] mb-[32px]">
          <Tag>{label}</Tag>
        </p>
        <h2 className="text-[112px] leading-[1.02] font-bold tracking-[-0.03em] text-balance">{person.name}</h2>
        <p className="text-[36px] mt-[28px] text-foreground-muted">{person.role}</p>
        <p className="text-[44px] mt-[64px] leading-[1.3] max-w-[900px] text-pretty">“{person.talk}”</p>
      </div>
      <div className="slide-in [--d:200ms] size-[720px] -mr-[60px] [&>canvas]:size-full">
        <Portrait person={person} size={720} cells={70} />
      </div>
    </div>
  );
}

/** After the last talk, up during the hang out: the cover again, plus the village code. */
function ClosingSlide() {
  return <TitleSlide qr />;
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

type Arrival = { id: string; name: string };

/** Everyone who has moved in, oldest first; polls while the slide is up. null until the first answer. */
function useVillagers() {
  const [villagers, setVillagers] = useState<Arrival[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/villagers", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setVillagers(d.villagers.map(({ id, name }: Arrival) => ({ id, name }))))
        .catch(() => {});
    load();
    const t = window.setInterval(load, 5000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  return villagers;
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

/** *codeplain's wordmark (from the codeplain website's brand folder), in currentColor. */
function CodeplainLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 498 108" fill="none" className={className} aria-hidden="true">
      <path fill="currentColor" d="M95.5343 23.2646C76.6077 23.2646 65.0916 36.7019 65.0916 56.0557C65.0916 75.4095 76.5076 88.8468 95.5343 88.8468C114.561 88.8468 125.777 75.4095 125.777 56.0557C125.777 36.7019 114.361 23.2646 95.5343 23.2646ZM95.5343 80.2228C81.5146 80.2228 74.9054 69.2925 74.9054 55.9554C74.9054 42.6184 81.6148 31.688 95.5343 31.688C109.454 31.688 116.063 42.6184 116.063 55.9554C116.063 69.2925 109.354 80.2228 95.5343 80.2228Z" />
      <path fill="currentColor" d="M179.853 32.9917H179.653C176.048 27.6769 170.139 23.2646 160.225 23.2646C144.704 23.2646 132.286 35.5989 132.286 56.0557C132.286 76.5126 144.704 88.8468 160.225 88.8468C175.747 88.8468 176.048 84.234 179.653 79.4206H179.853V87.1421H189.567V0.100281H179.853V33.0919V32.9917ZM161.127 80.2228C148.309 80.2228 141.9 68.1894 141.9 55.9555C141.9 43.7215 148.309 31.688 161.127 31.688C173.945 31.688 179.853 41.3148 179.853 55.9555C179.853 70.5961 172.643 80.2228 161.127 80.2228Z" />
      <path fill="currentColor" d="M229.222 23.2646C211.097 23.2646 199.38 35.298 199.38 56.0557C199.38 76.8134 210.796 88.8468 229.623 88.8468C248.449 88.8468 253.957 79.6212 257.061 67.9888H247.348C246.246 72.3008 241.64 80.3231 229.222 80.3231C216.805 80.3231 208.994 69.8941 208.994 58.6629H257.963C257.963 36.6016 248.449 23.3649 229.022 23.3649L229.222 23.2646ZM209.194 50.039C209.194 40.0111 217.606 31.7883 229.222 31.7883C240.839 31.7883 248.449 40.1114 248.449 50.039H209.194Z" />
      <path fill="currentColor" d="M297.418 23.2646C287.204 23.2646 281.396 27.8774 277.69 32.6908H277.49V24.9693H267.776V108H277.49V79.0195H277.69C281.295 84.3342 287.204 88.7465 297.418 88.7465C312.74 88.7465 325.157 76.4122 325.157 55.9554C325.157 35.4986 312.74 23.1643 297.418 23.1643V23.2646ZM296.216 80.2228C284.7 80.2228 277.49 70.5961 277.49 55.9554C277.49 41.3147 284.7 31.688 296.216 31.688C307.733 31.688 315.443 43.7214 315.443 55.9554C315.443 68.1894 309.034 80.2228 296.216 80.2228Z" />
      <path fill="currentColor" d="M345.486 0H335.772V87.0418H345.486V0Z" />
      <path fill="currentColor" d="M406.872 73.0028V42.8189C406.872 27.8774 396.257 23.1643 384.54 23.1643C366.515 23.1643 359.105 32.1894 358.504 44.1225H368.217C368.818 35.0975 372.724 31.688 384.54 31.688C396.357 31.688 397.158 35.7994 397.158 40.7131C397.158 45.6267 392.451 48.2339 381.937 50.2395C365.914 53.2479 355.399 56.9582 355.399 71.0975C355.399 85.2368 363.311 88.7465 375.828 88.7465C388.346 88.7465 392.952 85.1365 396.858 79.22H397.058C398.76 86.039 402.265 87.6434 408.174 87.6434C414.082 87.6434 411.378 87.5432 413.882 86.6407V79.8217C407.673 80.5236 406.872 77.9164 406.872 73.0028ZM397.158 63.0752C397.158 75.0083 388.446 80.2228 376.83 80.2228C365.213 80.2228 365.113 76.7131 365.113 70.5961C365.113 64.4791 370.721 60.1671 382.738 57.5599C389.347 56.2563 395.255 54.5515 397.058 52.6462V62.9749L397.158 63.0752Z" />
      <path fill="currentColor" d="M427.301 1.20331C424.597 1.20331 421.192 3.30916 421.192 7.01947C421.192 10.7298 424.597 12.8356 427.301 12.8356C430.005 12.8356 433.409 10.7298 433.409 7.01947C433.409 3.30916 430.105 1.20331 427.301 1.20331Z" />
      <path fill="currentColor" d="M432.208 24.9692H422.494V87.0417H432.208V24.9692Z" />
      <path fill="currentColor" d="M477.171 23.2646C466.556 23.2646 460.047 27.9777 456.742 32.3899H456.542V24.9693H446.828V87.0418H456.542V48.3342C456.542 38.7075 463.852 31.7883 474.767 31.7883C485.683 31.7883 488.286 38.1058 488.286 46.1281V87.0418H498V43.7214C498 29.4819 488.487 23.2646 477.171 23.2646Z" />
      <path fill="currentColor" d="M46.4654 36.6017V36.4011C46.5656 36.4011 46.4654 36.6017 46.4654 36.6017C48.6685 38.2061 50.5712 40.1114 52.1735 42.3175L52.4739 42.7187L58.8829 36.3008L58.6826 36C57.7813 34.8969 56.8801 33.7939 55.9788 32.8914C55.1777 32.0891 54.2764 31.2869 53.275 30.4847L52.574 29.9833C49.0691 27.376 45.2637 25.4707 41.0578 24.3677H40.5571C40.5571 24.2674 40.5571 33.5933 40.5571 33.5933H40.8576C42.8604 34.3955 44.8632 35.3983 46.5656 36.7019L46.4654 36.6017Z" />
      <path fill="currentColor" d="M52.0732 69.6936C50.4709 71.8998 48.5682 73.8051 46.3651 75.4095C44.6627 76.6129 42.6599 77.6157 40.6571 78.4179H40.3567V87.9444H40.8574C45.0633 86.741 48.8687 84.8357 52.3736 82.2285L53.0746 81.7271C54.076 80.9248 54.9772 80.1226 55.7784 79.3204C56.6796 78.4179 57.681 77.3148 58.4822 76.2117L58.6824 75.9109L52.2734 69.4931L51.973 69.8942L52.0732 69.6936Z" />
      <path fill="currentColor" d="M32.746 23.1644C31.4442 23.1644 30.0422 23.1644 28.6403 23.4652H28.2397V45.1254L13.0183 29.883L12.7179 30.0836C11.6163 30.9861 10.5148 31.8886 9.61351 32.7911C8.71225 33.6936 7.71084 34.7967 6.90972 35.8998L6.70943 36.2006L21.9308 51.4429H0.300422V51.844C0.10014 53.2479 0 54.6519 0 55.9555C0 57.2591 -7.75951e-07 58.663 0.300422 60.0669V60.468H21.9308L6.70943 75.7103L6.90972 76.0112C7.81098 77.1143 8.71225 78.2173 9.61351 79.1198C10.5148 80.0223 11.6163 81.0251 12.7179 81.8273L13.0183 82.0279L28.2397 66.7855V88.4457H28.6403C30.0422 88.6463 31.4442 88.7466 32.746 88.7466C34.0479 88.7466 35.4498 88.7466 36.8518 88.4457H37.2524V65.5822L27.5387 55.8552L37.2524 46.1282V23.3649H36.8518C35.4498 23.1644 34.0479 23.0641 32.746 23.0641V23.1644Z" />
      <path fill="currentColor" d="M46.4654 36.6017V36.4011C46.5656 36.4011 46.4654 36.6017 46.4654 36.6017C48.6685 38.2061 50.5712 40.1114 52.1735 42.3175L52.4739 42.7187L58.8829 36.3008L58.6826 36C57.7813 34.8969 56.8801 33.7939 55.9788 32.8914C55.1777 32.0891 54.2764 31.2869 53.275 30.4847L52.574 29.9833C49.0691 27.376 45.2637 25.4707 41.0578 24.3677H40.5571C40.5571 24.2674 40.5571 33.5933 40.5571 33.5933H40.8576C42.8604 34.3955 44.8632 35.3983 46.5656 36.7019L46.4654 36.6017Z" />
      <path fill="currentColor" d="M52.0732 69.6936C50.4709 71.8998 48.5682 73.8051 46.3651 75.4095C44.6627 76.6129 42.6599 77.6157 40.6571 78.4179H40.3567V87.9444H40.8574C45.0633 86.741 48.8687 84.8357 52.3736 82.2285L53.0746 81.7271C54.076 80.9248 54.9772 80.1226 55.7784 79.3204C56.6796 78.4179 57.681 77.3148 58.4822 76.2117L58.6824 75.9109L52.2734 69.4931L51.973 69.8942L52.0732 69.6936Z" />
      <path fill="currentColor" d="M32.746 23.1644C31.4442 23.1644 30.0422 23.1644 28.6403 23.4652H28.2397V45.1254L13.0183 29.883L12.7179 30.0836C11.6163 30.9861 10.5148 31.8886 9.61351 32.7911C8.71225 33.6936 7.71084 34.7967 6.90972 35.8998L6.70943 36.2006L21.9308 51.4429H0.300422V51.844C0.10014 53.2479 0 54.6519 0 55.9555C0 57.2591 -7.75951e-07 58.663 0.300422 60.0669V60.468H21.9308L6.70943 75.7103L6.90972 76.0112C7.81098 77.1143 8.71225 78.2173 9.61351 79.1198C10.5148 80.0223 11.6163 81.0251 12.7179 81.8273L13.0183 82.0279L28.2397 66.7855V88.4457H28.6403C30.0422 88.6463 31.4442 88.7466 32.746 88.7466C34.0479 88.7466 35.4498 88.7466 36.8518 88.4457H37.2524V65.5822L27.5387 55.8552L37.2524 46.1282V23.3649H36.8518C35.4498 23.1644 34.0479 23.0641 32.746 23.0641V23.1644Z" />
    </svg>
  );
}
