"use client";

// ---------------------------------------------------------------------------
// The village at the end of the homepage, inside an old tv (about 70% of the
// viewport). It switches on as you scroll: the moment the tv appears, the
// screen is a thin bright line; it opens vertically until the tv is centred,
// then the village is playable. The opening is a clip-path on a fixed-size
// screen, so the canvas never resizes. The engine only loads once the tv is
// near, so the hero and the page loader never wait for it.
// ---------------------------------------------------------------------------
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Keys, useCoarsePointer } from "../village/keys";

const VillageApp = dynamic(() => import("../village/village-app").then((m) => m.VillageApp), {
  ssr: false,
  loading: () => null,
});

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function VillageWindow() {
  const tv = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [open, setOpen] = useState(false);
  const touch = useCoarsePointer();

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
    const update = () => {
      raf = 0;
      const el = tv.current, pic = picture.current, ln = line.current;
      if (!el || !pic || !ln) return;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      // 0 when the tv's top enters at the bottom of the screen, 1 when it's centred
      const start = vh, end = Math.min(vh * 0.5 - r.height / 2, vh - r.height);
      const p = clamp((start - r.top) / Math.max(1, start - end));
      const e = easeOut(clamp((p - 0.08) / 0.92));
      const inset = (1 - e) * 50;
      pic.style.clipPath = `inset(calc(${inset}% - 1px) 0 calc(${inset}% - 1px) 0)`;
      pic.style.filter = e < 1 ? `brightness(${1 + (1 - e) * 0.8})` : "";
      ln.style.opacity = String(p < 0.02 ? 0 : 1 - clamp(e * 3));
      ln.style.transform = `translateY(-50%) scaleX(${0.2 + clamp(p * 6) * 0.8})`;
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
    <section aria-labelledby="village-title" className="village-section relative z-10 bg-[#040c2a] text-[#93c5fd] min-h-svh px-4 py-6 flex flex-col items-center justify-center gap-4 sm:gap-5">
      <header className="flex flex-col items-center gap-2.5 sm:gap-3 text-center">
        <h2 id="village-title" className="text-[26px] leading-[1.05] sm:text-[40px] font-medium tracking-[-0.03em] text-white text-balance">
          slovenian designer village
        </h2>
        <Link
          href="/village/join"
          className="mt-0.5 inline-flex items-center gap-1.5 border border-[#93c5fd]/40 px-3 py-1.5 text-xs text-[#93c5fd] transition-[background-color,color,border-color,scale] duration-150 ease-out hover:bg-[#93c5fd] hover:text-[#040c2a] hover:border-[#93c5fd] active:scale-[0.97]"
        >
          move in →
        </Link>
      </header>

      <div ref={tv} className="relative">

        <div className="tv-body relative rounded-[30px] sm:rounded-[38px] p-3 sm:p-5 pb-12 sm:pb-14">
          <div className="tv-screen relative overflow-hidden rounded-[18px] sm:rounded-[26px] w-[min(86vw,calc((100svh-330px)*3/4))] aspect-[3/4] sm:w-[min(64vw,calc((100svh-330px)*4/3))] sm:aspect-[4/3]">
            <div ref={picture} className="absolute inset-0 text-foreground bg-[#f1f4fc] dark:bg-[#16275e]" style={{ clipPath: "inset(50% 0 50% 0)" }}>
              <div className={`absolute inset-0 ${open ? "" : "pointer-events-none"}`} inert={!open}>
                {near && <VillageApp screen={false} me={null} inline active={open} />}
              </div>
            </div>
            <div ref={line} aria-hidden="true" className="tv-line absolute inset-x-[6%] top-1/2 h-[3px] opacity-0 pointer-events-none" />
            <div aria-hidden="true" className="tv-glass absolute inset-0 pointer-events-none" />
          </div>
          {/* chin: name plate, speaker, knobs */}
          <div aria-hidden="true" className="absolute inset-x-5 sm:inset-x-7 bottom-3 sm:bottom-4 h-7 flex items-center justify-between gap-4">
            <span className="text-[10px] tracking-[0.2em] text-[#93c5fd]/80">dst·tv</span>
            <span className="tv-grille flex-1 h-3 max-w-40" />
            <span className="flex gap-2">
              <span className="tv-knob size-5 sm:size-6 rounded-full" />
              <span className="tv-knob size-5 sm:size-6 rounded-full rotate-90" />
            </span>
          </div>
        </div>
        {/* feet */}
        <div aria-hidden="true" className="flex justify-between px-[14%]">
          <span className="block w-8 h-2.5 rounded-b-md bg-[#0b1238]" />
          <span className="block w-8 h-2.5 rounded-b-md bg-[#0b1238]" />
        </div>
      </div>

      <Keys touch={touch} className="justify-center" />
    </section>
  );
}
