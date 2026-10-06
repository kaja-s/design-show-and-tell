"use client";

// Full-page loading state for slow loads. Rendered in the server HTML (via
// layout.tsx) so it exists before any JavaScript runs. It stays invisible for
// SHOW_AFTER_MS (CSS animation delay), so a fast load never shows it; a slow
// one fades in the Blocks indicator. It leaves once the window "load" event
// has fired (or after MAX_WAIT_MS as a cap), fading from whatever opacity it
// has reached so it can never flash.

import { useEffect, useRef, useState } from "react";
import { Blocks } from "loading-dev";

const SHOW_AFTER_MS = 400; // applied as the fade-in animation-delay below
const MAX_WAIT_MS = 4000;
const FADE_MS = 300;

export function PageLoader() {
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let finished = false;
    const timers: number[] = [];

    const leave = () => {
      if (finished) return;
      finished = true;
      const el = ref.current;
      const current = el ? parseFloat(getComputedStyle(el).opacity) : 0;
      if (!el || current < 0.05) {
        // never became visible: drop it without a fade
        timers.push(window.setTimeout(() => setDone(true), 0));
        return;
      }
      el.style.animation = "none";
      el.style.opacity = String(current);
      requestAnimationFrame(() => {
        el.style.transition = `opacity ${FADE_MS}ms ease-out`;
        el.style.opacity = "0";
      });
      timers.push(window.setTimeout(() => setDone(true), FADE_MS + 20));
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
