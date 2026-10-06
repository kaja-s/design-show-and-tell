"use client";

// Full-page loading state for slow loads. Rendered in the server HTML (via
// layout.tsx) so it exists before any JavaScript runs. It stays invisible for
// SHOW_AFTER_MS (CSS animation delay), so a fast load never shows it; a slow
// one fades in the Blocks indicator. It leaves once the window "load" event
// has fired (or after MAX_WAIT_MS as a cap), but once it has become visible it
// stays for at least MIN_VISIBLE_MS so a slow-ish load doesn't produce a
// half-second blink. It fades from whatever opacity it has reached.

import { useEffect, useRef, useState } from "react";
import { Blocks } from "loading-dev";

const SHOW_AFTER_MS = 400; // applied as the fade-in animation-delay below
const MAX_WAIT_MS = 4000;
const MIN_VISIBLE_MS = 2000; // once shown, stay at least this long
const FADE_MS = 300;

export function PageLoader() {
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let finished = false;
    let visibleAt: number | null = null;
    const timers: number[] = [];
    const el = ref.current;

    // The fade-in keyframe starts after SHOW_AFTER_MS; that's the moment the
    // loader is actually on screen and the minimum-visible clock starts.
    const markVisible = (at: number) => {
      if (visibleAt !== null) return;
      visibleAt = at;
      performance.mark("page-loader:visible");
    };
    // The element has been animating since first paint, long before this
    // effect runs on a slow device, so the start event may already be gone.
    // Read the running animation's clock instead and back-date visibleAt.
    const running = el?.getAnimations().find((a) => (a as CSSAnimation).animationName === "page-loader-in");
    const elapsed = typeof running?.currentTime === "number" ? running.currentTime : null;
    if (elapsed !== null && elapsed > SHOW_AFTER_MS) {
      markVisible(performance.now() - (elapsed - SHOW_AFTER_MS));
    }
    const onAnimStart = (e: AnimationEvent) => {
      if (e.animationName === "page-loader-in") markVisible(performance.now());
    };
    el?.addEventListener("animationstart", onAnimStart);

    const fadeOut = () => {
      if (!el) {
        setDone(true);
        return;
      }
      const current = parseFloat(getComputedStyle(el).opacity);
      if (visibleAt === null && current < 0.05) {
        // never became visible: drop it without a fade
        setDone(true);
        return;
      }
      el.style.animation = "none";
      el.style.opacity = String(current);
      requestAnimationFrame(() => {
        el.style.transition = `opacity ${FADE_MS}ms ease-out`;
        el.style.opacity = "0";
      });
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

    const onLoad = () => leave();
    timers.push(
      window.setTimeout(() => {
        if (document.readyState === "complete") leave();
        else window.addEventListener("load", onLoad, { once: true });
      }, 0)
    );
    timers.push(window.setTimeout(leave, MAX_WAIT_MS));

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", onLoad);
      el?.removeEventListener("animationstart", onAnimStart);
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      className="page-loader fixed inset-0 z-[9998] flex items-center justify-center bg-background text-foreground"
      style={{ animationDelay: `${SHOW_AFTER_MS}ms` }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Blocks size={28} />
      <span className="sr-only">loading</span>
    </div>
  );
}
