"use client";

// A canvas that redraws every frame at device resolution, in css pixels.
// `draw` may change between renders; the latest one is always used.
import { useEffect, useRef, type RefObject } from "react";

export type Draw = (g: CanvasRenderingContext2D, W: number, H: number, dt: number, t: number) => void;

export function useCanvasLoop(canvas: RefObject<HTMLCanvasElement | null>, draw: Draw) {
  const latest = useRef(draw);
  useEffect(() => {
    latest.current = draw;
  });
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    let raf = 0, last = performance.now();
    const start = last;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.imageSmoothingEnabled = false;
      latest.current(g, W, H, dt, (now - start) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canvas]);
}

export const ink = () => getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || "#021093";
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const STEP_LABELS = ["you", "look", "role"] as const;

/** Seconds since `step` last changed (large on first render, so nothing plays on load). */
export function useSinceChange(step: number) {
  const at = useRef({ step, t: -1e9 });
  return (now: number) => {
    if (at.current.step !== step) at.current = { step, t: now };
    return now - at.current.t;
  };
}
