"use client";

// Full-page loading state for slow loads. Rendered in the server HTML (via
// layout.tsx) so it exists before any JavaScript runs. The overlay covers the
// page from the first paint (otherwise the page shows, then gets covered);
// only the Blocks mark waits SHOW_AFTER_MS (CSS animation delay), so a fast
// load sees a plain background fade into the page. It leaves once the wolf
// shader has drawn its first frame (or after MAX_WAIT_MS as a cap), so the
// page never appears with an empty wolf slot. Once the mark has
// become visible it stays for at least MIN_VISIBLE_MS so a slow-ish load
// doesn't produce a half-second blink.

import { useEffect, useRef, useState } from "react";
import { Blocks } from "loading-dev";
import { WOLF_READY_EVENT } from "./shader-canvas";

const SHOW_AFTER_MS = 400; // applied as the fade-in animation-delay below
const MAX_WAIT_MS = 6000; // keep below the CSS fallback in globals.css (8s)
const MIN_VISIBLE_MS = 2000; // once shown, stay at least this long
const FADE_MS = 300;

export function PageLoader() {
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let finished = false;
    let visibleAt: number | null = null;
    const timers: number[] = [];
    const el = ref.current;
    const mark = markRef.current;

    // JS is running, so cancel the CSS-only fallback fade (page-loader-out).
    // If it has already started, let it finish and just unmount after.
    if (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 1) {
        const t = window.setTimeout(() => setDone(true), FADE_MS);
        return () => clearTimeout(t);
      }
      el.style.animation = "none";
    }

    // The mark's fade-in keyframe starts after SHOW_AFTER_MS; that's the moment
    // the spinner is actually on screen and the minimum-visible clock starts.
    const markVisible = (at: number) => {
      if (visibleAt !== null) return;
      visibleAt = at;
      performance.mark("page-loader:visible");
    };
    // The element has been animating since first paint, long before this
    // effect runs on a slow device, so the start event may already be gone.
    // Read the running animation's clock instead and back-date visibleAt.
    const running = mark?.getAnimations().find((a) => (a as CSSAnimation).animationName === "page-loader-in");
    const elapsed = typeof running?.currentTime === "number" ? running.currentTime : null;
    if (elapsed !== null && elapsed > SHOW_AFTER_MS) {
      markVisible(performance.now() - (elapsed - SHOW_AFTER_MS));
    }
    const onAnimStart = (e: AnimationEvent) => {
      if (e.animationName === "page-loader-in") markVisible(performance.now());
    };
    mark?.addEventListener("animationstart", onAnimStart);

    const fadeOut = () => {
      if (!el) {
        setDone(true);
        return;
      }
      // Always fade the overlay: even when the mark never appeared, the
      // background is covering the page and a hard cut would flash.
      el.style.pointerEvents = "none";
      el.style.transition = `opacity ${FADE_MS}ms ease-out`;
      el.style.opacity = "0";
      timers.push(
        window.setTimeout(() => {
          performance.mark("page-loader:hidden");
          setDone(true);
        }, FADE_MS + 20)
      );
    };

    const leave = () => {
      if (finished) return;
      finished = true;
      if (visibleAt === null) {
        timers.push(window.setTimeout(fadeOut, 0));
        return;
      }
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - visibleAt));
      timers.push(window.setTimeout(fadeOut, remaining));
    };

    const onWolfReady = () => leave();
    if (window.__wolfReady) leave();
    else window.addEventListener(WOLF_READY_EVENT, onWolfReady, { once: true });
    timers.push(window.setTimeout(leave, MAX_WAIT_MS));

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener(WOLF_READY_EVENT, onWolfReady);
      mark?.removeEventListener("animationstart", onAnimStart);
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      className="page-loader fixed inset-0 z-[9998] flex items-center justify-center bg-background text-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div ref={markRef} className="page-loader-mark" style={{ animationDelay: `${SHOW_AFTER_MS}ms` }}>
        <Blocks size={28} />
      </div>
      <span className="sr-only">loading</span>
    </div>
  );
}
