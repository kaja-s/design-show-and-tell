"use client";

// ---------------------------------------------------------------------------
// The join steps: the you · look · role bar is a strip of pixel sidewalk with a signpost per step,
// and your own character (in whatever you've picked so far) walks to the next
// sign when you go forward, back when you go back, and hops on arrival.
// Walking is constant speed with walk frames (it's a walk, not an ease);
// reduced motion puts it straight at the sign.
// ---------------------------------------------------------------------------
import { useEffect, useRef } from "react";
import { sprite, SPRITE_H, SPRITE_W, type Dir } from "../lib/sprites";
import type { Config } from "../lib/villager";

const STOPS = ["you", "look", "role"];
const SPEED = 150; // css px per second
const HOP_SEC = 0.28;

export function TrailSteps({ step, config }: { step: number; config: Config }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ step, config });

  useEffect(() => {
    live.current.step = step;
    live.current.config = config;
  }, [step, config]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--foreground").trim() || "#021093";
    const pixelFont = css.getPropertyValue("--font-pixel").trim() || "monospace";
    let x = -1, walked = 0, hop = 1, last = performance.now(), raf = 0;

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
      const stopX = (i: number) => ((i + 0.5) / STOPS.length) * W;
      const cur = Math.min(Math.max(live.current.step, 1), STOPS.length) - 1;
      const target = stopX(cur) - 18;

      // walk toward the current sign
      if (x < 0 || reduced) x = target;
      const gap = target - x;
      const moving = Math.abs(gap) > 0.5;
      if (moving) {
        const d = Math.sign(gap) * Math.min(Math.abs(gap), SPEED * dt);
        x += d;
        walked += Math.abs(d);
        if (Math.abs(target - x) <= 0.5) hop = 0; // just arrived
      }
      hop += dt;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.imageSmoothingEnabled = false;
      const ground = H - 6;

      // sidewalk: a kerb line with paving joints
      g.fillStyle = ink;
      g.globalAlpha = 0.18;
      g.fillRect(0, ground, W, 2);
      for (let px = 6; px < W; px += 16) g.fillRect(px, ground + 2, 1, 3);
      g.globalAlpha = 1;

      // signposts: done and current are inked, the ones ahead are faint
      STOPS.forEach((_, i) => {
        const sx = Math.round(stopX(i));
        g.globalAlpha = i <= cur ? 1 : 0.22;
        g.fillStyle = ink;
        g.fillRect(sx, ground - 30, 2, 30);
        const fw = 16, fh = 12;
        if (i <= cur) g.fillRect(sx + 2, ground - 30, fw, fh);
        else {
          g.fillRect(sx + 2, ground - 30, fw, 1);
          g.fillRect(sx + 2, ground - 30 + fh - 1, fw, 1);
          g.fillRect(sx + 1 + fw, ground - 30, 1, fh);
        }
        g.fillStyle = i <= cur ? "#ffffff" : ink;
        g.font = `600 10px ${pixelFont}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(String(i + 1), sx + 2 + fw / 2, ground - 30 + fh / 2 + 1);
      });
      g.globalAlpha = 1;

      // you
      const S = 2; // css px per sprite pixel
      const dir: Dir = moving ? (gap > 0 ? "right" : "left") : "down";
      const frame = moving ? Math.floor(walked / 7) % 4 : 0;
      const lift = !reduced && hop < HOP_SEC ? Math.round(Math.sin((hop / HOP_SEC) * Math.PI) * 3) : 0;
      g.fillStyle = ink;
      g.globalAlpha = 0.14;
      g.fillRect(Math.round(x) - 9, ground - 1, 18, 3);
      g.globalAlpha = 1;
      g.drawImage(sprite(live.current.config, { dir, frame }), Math.round(x - (SPRITE_W * S) / 2), ground - (SPRITE_H + lift) * S + 2, SPRITE_W * S, SPRITE_H * S);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="-mx-1">
      <canvas ref={canvas} aria-hidden="true" className="block w-full h-[64px]" />
      <ol className="grid grid-cols-3 mt-1" aria-label="steps">
        {STOPS.map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`village-title text-center text-[13px] transition-opacity duration-200 ${step >= i + 1 ? "" : "opacity-35"}`}
            style={{ textShadow: "none" }}
          >
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
