"use client";

// ---------------------------------------------------------------------------
// "Tower" step variant: the three steps are the floors of your building,
// stacked from the street up. Finished floors have their light on, the
// current floor's window has you looking out of it, and moving up a step
// switches the next light on with a quick flicker.
// ---------------------------------------------------------------------------
import { useRef } from "react";
import { sprite } from "../../lib/sprites";
import type { Config } from "../../lib/villager";
import { ink, reducedMotion, STEP_LABELS, useCanvasLoop, useSinceChange } from "./loop";

const LIT = "#f2c14e";
const NEXT = ["", "next: your look", "next: what you do", "then you move in"];

export function TowerSteps({ step, config }: { step: number; config: Config }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const since = useSinceChange(step);

  useCanvasLoop(canvas, (g, W, H, _dt, t) => {
    const fg = ink();
    const flick = since(t);
    const x0 = 2, w = W - 4, floorH = 20, roof = 8;
    const base = H - 3;

    // street, walls, roof and cornice
    g.fillStyle = fg;
    g.globalAlpha = 0.18;
    g.fillRect(0, base, W, 2);
    g.globalAlpha = 0.1;
    g.fillRect(x0, base - floorH * 3, w, floorH * 3);
    g.globalAlpha = 1;
    g.fillRect(x0 - 2, base - floorH * 3 - 2, w + 4, 2);
    g.fillRect(x0 + 6, base - floorH * 3 - roof, w - 12, roof - 2);
    g.fillRect(x0 + w / 2 - 1, base - floorH * 3 - roof - 5, 2, 5);

    for (let i = 0; i < 3; i++) {
      const fy = base - floorH * (i + 1);
      const wx = x0 + 6, wy = fy + 4, ww = w - 12, wh = floorH - 6;
      const n = i + 1;
      // the floor that just became current flickers on for a moment
      const flickering = n === step && flick < 0.3 && !reducedMotion();
      const on = n < step || (n === step && (!flickering || Math.floor(flick / 0.06) % 2 === 1));
      g.fillStyle = fg;
      g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
      g.fillStyle = on ? LIT : "#0b1238";
      g.globalAlpha = on ? 1 : 0.85;
      g.fillRect(wx, wy, ww, wh);
      g.globalAlpha = 1;
      // you, looking out: the top of your sprite, peeking over the sill
      if (n === step && on) {
        const head = sprite(config, { dir: "down", frame: 0, blink: Math.floor(t * 10) % 34 === 0 });
        g.drawImage(head, 0, 1, 16, wh, wx + Math.round((ww - 16) / 2), wy, 16, wh);
      }
      // mullion and sill
      g.fillStyle = fg;
      if (n !== step) g.fillRect(wx + ww / 2, wy, 1, wh);
      g.fillRect(wx - 2, wy + wh + 1, ww + 4, 1);
    }
  });

  const label = STEP_LABELS[Math.min(Math.max(step, 1), 3) - 1];
  return (
    <div className="flex items-end gap-4">
      <canvas ref={canvas} aria-hidden="true" className="block w-[44px] h-[76px] shrink-0" />
      <div className="flex flex-col gap-1 pb-1 min-w-0">
        <span className="text-[11px] opacity-60 tabular-nums">floor {step} of 3</span>
        <span key={label} className="village-title village-step text-2xl leading-none" style={{ textShadow: "none" }}>{label}</span>
        <span className="text-xs opacity-60">{NEXT[step]}</span>
      </div>
      <ol className="sr-only" aria-label="steps">
        {STEP_LABELS.map((l, i) => (
          <li key={l} aria-current={step === i + 1 ? "step" : undefined}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>
    </div>
  );
}
