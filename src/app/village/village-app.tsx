"use client";

// ---------------------------------------------------------------------------
// /village (walk around and meet people) and /village?screen (the big screen
// at the event). The three.js scene lives in lib/world.ts; this component
// owns everything drawn in HTML around it and keeps the villager list fresh
// by polling the api.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FeatherIcon from "feather-icons-react";
import { useTheme } from "../theme-provider";
import { signalWolfReady } from "../components/shader-canvas";
import { Village } from "./lib/world";
import { portrait } from "./lib/sprites";
import { normLink, photoUrl, type Villager } from "./lib/villager";
import { readMe } from "./lib/me";
import { Keys, useCoarsePointer } from "./keys";
import { CHIP, CHIP_ON, ICON_CHIP } from "./chips";
import { FilesPanel, LetterPanel, LostPanel } from "./egg-panels";
import type { EggEvent } from "./lib/world";

const POLL_SCREEN_MS = 3000;
const EGG_BANNERS: Record<Exclude<EggEvent, "files" | "letter" | "lost">, string> = {
  "grid-on": "8px grid on · press g to hide it",
  "grid-off": "8px grid off",
  "figma-on": "multiplayer on · type figma again to leave",
  "figma-off": "multiplayer off",
  kerned: "perfectly kerned ✓",
};
const POLL_EXPLORE_MS = 15000;


export function Avatar({ v, size }: { v: Villager; size: number }) {
  const src = useMemo(() => (v.hasPhoto ? photoUrl(v) : portrait(v.config)), [v]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="rounded-full object-cover bg-[#dbe8ff] shrink-0 [image-rendering:pixelated]" style={{ width: size, height: size }} />;
}

// inline: the homepage footer. Same village, fewer controls, and it only
// takes the keyboard once you click into it.
// active: inline only, true once the tv has opened; the village takes the keys then.
// night: overrides the site theme (the homepage tv's day/night knob).
export function VillageApp({ screen, me, inline = false, active = true, night }: { screen: boolean; me: string | null; inline?: boolean; active?: boolean; night?: boolean }) {
  const { theme, toggle } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const village = useRef<Village | null>(null);

  const [villagers, setVillagers] = useState<Villager[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; met: boolean } | null>(null);
  const [egg, setEgg] = useState<"files" | "letter" | "lost" | null>(null);
  const [card, setCard] = useState<Villager | null>(null);
  const [progress, setProgress] = useState({ met: 0, total: 0 });
  const [met, setMet] = useState<Set<string>>(() => new Set());
  const [zoomed, setZoomed] = useState(false);
  const [dirOpen, setDirOpen] = useState(false);
  const [onboard, setOnboard] = useState(!screen && !me && !inline);
  const playing = !inline || active;
  const [banner, setBanner] = useState<string | null>(null);
  const [myId] = useState(() => readMe()?.id ?? null);
  const touch = useCoarsePointer();
  const bannerTimer = useRef<number>(0);

  const showBanner = useCallback((text: string) => {
    setBanner(text);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 5000);
  }, []);

  // the scene
  useEffect(() => {
    const canvas = canvasRef.current, bubbleEl = bubbleRef.current, labels = labelsRef.current;
    if (!canvas || !bubbleEl || !labels) return;
    const v = new Village(
      { canvas, minimap: minimapRef.current, bubble: bubbleEl, labels },
      {
        onBubble: (text, met) => setBubble(text ? { text, met } : null),
        onEgg: (e: EggEvent) => {
          if (e === "files" || e === "letter" || e === "lost") setEgg(e);
          else showBanner(EGG_BANNERS[e]);
        },
        onCard: (v) => {
          setCard(v);
          if (v) setEgg(null);
          if (v) setMet((m) => (m.has(v.id) ? m : new Set(m).add(v.id)));
        },
        onProgress: (met, total) => setProgress({ met, total }),
        onArrival: (a) => showBanner(`${a.name} moved in`),
        onAllMet: () => window.setTimeout(() => showBanner("you've met everyone"), 600),
        onFirstFrame: inline ? () => {} : signalWolfReady,
      },
      { mode: screen ? "projector" : inline ? "inline" : "explore", night: document.documentElement.classList.contains("dark") },
    );
    village.current = v;
    return () => {
      v.dispose();
      village.current = null;
      setBubble(null);
    };
  }, [screen, inline, showBanner]);

  // also after the scene is rebuilt (the tv switching to the big-screen channel)
  useEffect(() => {
    village.current?.setNight(night ?? theme === "dark");
  }, [theme, night, screen, inline]);

  useEffect(() => {
    if (village.current) village.current.inputEnabled = !onboard && !dirOpen && !egg && playing;
  }, [onboard, dirOpen, egg, playing]);

  // the villagers: the first load arrives quietly, later ones move in with a puff
  useEffect(() => {
    let first = true, stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/villagers", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const { villagers: list } = (await res.json()) as { villagers: Villager[] };
        if (stopped) return;
        setLoadError(false);
        setVillagers(list);
        village.current?.setVillagers(list, !first);
        if (first && me) village.current?.visit(me);
        first = false;
      } catch {
        if (first) setLoadError(true);
      }
    };
    load();
    const t = window.setInterval(load, screen ? POLL_SCREEN_MS : POLL_EXPLORE_MS);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [screen, me]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (egg) setEgg(null);
      else if (dirOpen) setDirOpen(false);
      else village.current?.closeCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirOpen, egg]);

  const closeEgg = () => {
    setEgg(null);
    canvasRef.current?.focus({ preventScroll: true });
  };
  const openList = () => {
    village.current?.closeCard();
    setDirOpen(true);
  };
  const toggleZoom = () => {
    const z = !zoomed;
    setZoomed(z);
    village.current?.setZoom(z ? 1 : 0);
  };
  const count = villagers?.length ?? 0;
  const empty = villagers !== null && count === 0;
  // pick someone from the list: walk over and say hi
  const walkTo = (id: string) => {
    setDirOpen(false);
    setZoomed(false);
    village.current?.walkToId(id);
    canvasRef.current?.focus({ preventScroll: true });
  };
  const listButton = (
    <button type="button" className={`${CHIP} ${CHIP_ON}`} aria-expanded={dirOpen} aria-label={`everyone in the village, ${count}`} onClick={() => setDirOpen((o) => !o)} disabled={!count}>
      <FeatherIcon icon={dirOpen ? "x" : "users"} size={14} />
      everyone
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );

  return (
    <main className={`relative w-full overflow-hidden select-none ${inline ? "h-full text-left" : "h-dvh"}`} data-mode={screen ? "projector" : inline ? "inline" : "explore"}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="the village. arrow keys or wasd to walk, enter to talk to the person next to you, or click someone."
        className={`absolute inset-0 size-full block [-webkit-tap-highlight-color:transparent] ${inline ? "touch-pan-y" : "touch-none outline-none"}`}
      />
      <div ref={labelsRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

      {/* next to someone (the scene draws a "…" over them): press enter, or tap this */}
      <button
        ref={bubbleRef}
        type="button"
        hidden={!bubble || screen || !!card || !!egg || (inline && !playing)}
        onClick={() => village.current?.talkToBubble()}
        className={`village-bubble absolute left-1/2 -translate-x-1/2 ${inline ? "bottom-4" : "bottom-6"} z-[3] flex items-center gap-3 min-w-[240px] max-w-[calc(100%-24px)] bg-background text-foreground border-2 border-foreground px-2.5 py-2 text-sm text-left shadow-[0_14px_30px_-14px_rgba(2,16,147,.55)] transition-[scale] duration-150 ease-out active:scale-[0.98]`}
      >
        <span aria-hidden="true" className="shrink-0 size-7 grid place-items-center border-2 border-foreground">
          <FeatherIcon icon="corner-down-right" size={14} />
        </span>
        {bubble && <span className="truncate">{touch ? "tap to " : ""}{bubble.text}{bubble.met ? " ✓" : ""}</span>}
      </button>

      {screen ? (
        <ProjectorOverlay count={count} />
      ) : inline ? (
        <>
          <div className="absolute inset-x-2.5 top-2.5 flex justify-between gap-2 pointer-events-none">
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              <div className="h-8 inline-flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-foreground/15 px-2.5 text-xs tabular-nums" aria-live="polite" aria-label={`met ${progress.met} of ${progress.total}`}>
                met {progress.met}/{progress.total}
              </div>
              {playing && listButton}
            </div>
            <Link href="/village" className={`${CHIP} pointer-events-auto shrink-0 whitespace-nowrap`}>
              open village
              <FeatherIcon icon="arrow-up-right" size={13} />
            </Link>
          </div>
          {dirOpen && playing && villagers && <Directory villagers={villagers} met={met} touch={touch} onPick={walkTo} />}
          {card && <Card v={card} mine={card.id === myId} onClose={() => village.current?.closeCard()} onList={openList} />}
          {egg === "files" && <FilesPanel onClose={closeEgg} />}
          {egg === "lost" && <LostPanel onClose={closeEgg} />}
          {egg === "letter" && <LetterPanel onClose={closeEgg} touch={touch} />}
        </>
      ) : (
        <>
          <div className="absolute inset-x-3 top-3 flex justify-between gap-2 pointer-events-none">
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              <Link href="/" className={ICON_CHIP} aria-label="back to design show & tell">
                <FeatherIcon icon="arrow-left" size={14} />
              </Link>
              {listButton}
              <div className="h-8 inline-flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-foreground/15 px-2.5 text-xs tabular-nums" aria-live="polite" aria-label={`met ${progress.met} of ${progress.total}`}>
                {progress.met}/{progress.total}
                <span className="w-12 h-1 bg-foreground/15 overflow-hidden" aria-hidden="true">
                  <i className="block h-full bg-foreground origin-left transition-transform duration-500 ease-out" style={{ transform: `scaleX(${progress.total ? progress.met / progress.total : 0})` }} />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button type="button" className={`${ICON_CHIP} ${zoomed ? CHIP_ON : ""}`} aria-pressed={zoomed} aria-label="see the whole village" title="see the whole village" onClick={toggleZoom}>
                <FeatherIcon icon={zoomed ? "minimize-2" : "maximize-2"} size={14} />
              </button>
              <button type="button" className={ICON_CHIP} onClick={toggle} aria-pressed={theme === "dark"} aria-label="night" title={theme === "dark" ? "night" : "day"}>
                <FeatherIcon icon={theme === "dark" ? "moon" : "sun"} size={14} />
              </button>
            </div>
          </div>

          {dirOpen && villagers && <Directory villagers={villagers} met={met} touch={touch} onPick={walkTo} />}
          <Keys touch={touch} className="absolute right-3 bottom-3 h-9 px-3 hidden sm:flex bg-background/90 backdrop-blur-sm border border-foreground/15" />

          <div className="absolute left-3 bottom-3 bg-background/90 backdrop-blur border border-foreground/15 p-1.5">
            <canvas ref={minimapRef} width={336} height={336} className="block size-[112px] sm:size-[152px] cursor-crosshair touch-none" aria-label="map of the village. click to walk there." />
          </div>

          {card && <Card v={card} mine={card.id === myId} onClose={() => village.current?.closeCard()} onList={openList} />}
          {egg === "files" && <FilesPanel onClose={closeEgg} />}
          {egg === "lost" && <LostPanel onClose={closeEgg} />}
          {egg === "letter" && <LetterPanel onClose={closeEgg} touch={touch} />}

          {onboard && <Onboarding count={count} touch={touch} onStart={() => { setOnboard(false); canvasRef.current?.focus({ preventScroll: true }); }} />}
          {empty && !onboard && (
            <p className="village-pop absolute left-1/2 bottom-6 -translate-x-1/2 bg-background/95 border border-foreground/15 px-4 py-2.5 text-sm whitespace-nowrap">
              nobody here yet ·{" "}
              <Link href="/village/join" className="underline underline-offset-2 hover:bg-highlight hover:text-highlight-text hover:no-underline">
                move in →
              </Link>
            </p>
          )}
        </>
      )}

      {loadError && (
        <p role="alert" className="absolute left-1/2 top-16 -translate-x-1/2 bg-background border border-danger text-danger px-4 py-2 text-sm">
          couldn&apos;t load the village. refresh to try again.
        </p>
      )}
      {banner && (
        <div className={`village-banner absolute left-1/2 -translate-x-1/2 ${screen ? "bottom-8 text-xl px-6 py-3" : "top-16 text-sm"} bg-highlight text-highlight-text px-4 py-2.5 max-w-[calc(100%-24px)] truncate pointer-events-none z-10`} aria-live="polite">
          {banner}
        </div>
      )}
    </main>
  );
}

function Card({ v, mine, onClose, onList }: { v: Villager; mine: boolean; onClose: () => void; onList: () => void }) {
  const portfolio = normLink(v.portfolio, "portfolio");
  const icons = (["linkedin", "twitter"] as const).map((k) => ({ k, link: normLink(v[k], k) })).filter((i) => i.link);
  return (
    <aside
      role="dialog"
      aria-labelledby="card-name"
      className="village-card absolute inset-x-0 bottom-0 max-h-[72%] sm:inset-x-auto sm:right-3 sm:top-14 sm:bottom-auto sm:w-[320px] overflow-y-auto bg-background/95 backdrop-blur border border-foreground/15 p-5 flex flex-col gap-4 select-text"
    >
      <button type="button" onClick={onClose} aria-label="close" className={`${ICON_CHIP} absolute right-3 top-3`}>
        <FeatherIcon icon="x" size={14} />
      </button>
      <div className="flex items-center gap-3.5 pr-10">
        <Avatar v={v} size={64} />
        <div className="flex flex-col gap-1.5 min-w-0">
          <h2 id="card-name" className="text-xl font-medium leading-tight tracking-tight break-words">
            {v.name}
            {mine && <span className="ml-2 align-middle text-[10px] px-1.5 py-0.5 border border-foreground/20 opacity-70">you</span>}
          </h2>
          <ul className="flex flex-wrap gap-1" aria-label="role">
            {v.tags.map((t) => (
              <li key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-highlight text-highlight-text">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-sm leading-relaxed break-words">{v.intro}</p>
      <div className="flex items-center gap-1.5">
        {portfolio && (
          <a href={portfolio.href} target="_blank" rel="noopener noreferrer" className={`${CHIP} flex-1 min-w-0 justify-between`}>
            <span className="truncate">{portfolio.text}</span>
            <FeatherIcon icon="arrow-up-right" size={14} className="shrink-0" />
          </a>
        )}
        {icons.map(({ k, link }) => (
          <a key={k} href={link!.href} target="_blank" rel="noopener noreferrer" title={link!.text} aria-label={`${v.name} on ${k === "twitter" ? "twitter / x" : k}`} className={ICON_CHIP}>
            <FeatherIcon icon={k} size={14} />
          </a>
        ))}
      </div>
      <button type="button" onClick={onList} className={`${CHIP} ${CHIP_ON} self-end`}>
        <FeatherIcon icon="users" size={14} />
        everyone →
      </button>
    </aside>
  );
}

// Everyone who lives here; pick a name and you walk over to them.
function Directory({ villagers, met, touch, onPick }: { villagers: Villager[]; met: Set<string>; touch: boolean; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = villagers.filter((v) => !q || [v.name, ...v.tags].join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="village-pop absolute left-3 right-3 sm:right-auto top-14 sm:w-[280px] max-h-[calc(100%-68px)] z-[3] flex flex-col overflow-hidden bg-background/95 backdrop-blur border border-foreground/15 select-text">
      <label htmlFor="dir-q" className="sr-only">
        search designers
      </label>
      <input id="dir-q" type="search" autoFocus={!touch} enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search" className="m-2.5 px-2.5 py-2 text-base sm:text-sm bg-transparent border border-foreground/20 placeholder:text-foreground/40" />
      <ul className="overflow-y-auto overscroll-contain pb-1.5" aria-label="everyone in the village">
        {list.map((v) => (
          <li key={v.id}>
            <button type="button" onClick={() => onPick(v.id)} aria-label={`walk to ${v.name}${met.has(v.id) ? ", met" : ""}`} className="w-full min-h-11 flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-150 hover:bg-highlight hover:text-highlight-text active:bg-highlight active:text-highlight-text">
              <Avatar v={v} size={30} />
              <span className="flex flex-col min-w-0 leading-tight">
                <span className="truncate">{v.name}</span>
                <small className="text-[11px] opacity-70 truncate">{v.tags.join(" · ")}</small>
              </span>
              {met.has(v.id) && <FeatherIcon icon="check" size={13} className="ml-auto shrink-0 opacity-60" />}
            </button>
          </li>
        ))}
        {!list.length && <li className="px-3 py-2 text-xs opacity-60">nobody matches that yet.</li>}
      </ul>
    </div>
  );
}

const HOW = [
  ["walk", "arrows, or click the street"],
  ["say hi", "enter, or click someone"],
  ["meet everyone", "collect their cards"],
];
const HOW_TOUCH = [
  ["walk", "tap where you want to go"],
  ["say hi", "tap someone"],
  ["meet everyone", "collect their cards"],
];
function Onboarding({ count, onStart, touch }: { count: number; onStart: () => void; touch: boolean }) {
  return (
    <div className="absolute inset-0 z-[5] grid place-items-center bg-[#040c2a]/25 p-4">
      <div role="dialog" aria-labelledby="ob-title" className="village-pop bg-background border border-foreground/15 p-6 w-full max-w-[340px] flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 id="ob-title" className="village-title text-xl leading-tight">
            slovenian designer village
          </h1>
          <span className="text-xs opacity-60 tabular-nums">{count} designers live here</span>
        </div>
        <ol className="flex flex-col gap-3">
          {(touch ? HOW_TOUCH : HOW).map(([title, how], i) => (
            <li key={title} className="village-stagger flex items-baseline gap-3" style={{ animationDelay: `${80 + i * 50}ms` }}>
              <span className="text-xs opacity-50 tabular-nums">{i + 1}</span>
              <span className="flex flex-col">
                <span className="text-sm">{title}</span>
                <span className="text-xs opacity-60">{how}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-4">
          <button type="button" autoFocus onClick={onStart} className={`${CHIP} ${CHIP_ON} h-9 px-4 text-sm`}>
            start
          </button>
          <Link href="/village/join" className="text-xs underline underline-offset-2 opacity-70 hover:opacity-100">
            move in yourself
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectorOverlay({ count }: { count: number }) {
  return (
    <>
      <div className="absolute left-5 top-5 flex flex-col gap-0.5 pointer-events-none">
        <b className="village-title text-[clamp(24px,3.2vw,44px)] leading-none">slovenian designer village</b>
        <span className="text-sm opacity-60">
          {count} {count === 1 ? "designer" : "designers"}
        </span>
      </div>
      <div className="absolute right-5 bottom-5 bg-background/95 border border-foreground/15 p-3 flex flex-col items-center gap-2 text-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/qr-village.svg" alt="qr code for design-show-and-tell.vercel.app/village/join" className="size-[clamp(100px,13vw,170px)] bg-white p-2" />
        <span>scan to move in</span>
      </div>
    </>
  );
}
