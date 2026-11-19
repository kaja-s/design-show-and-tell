"use client";

// ---------------------------------------------------------------------------
// "Channel" step variant: one step at a time, on a little tv like the one the
// village plays in. Each step is a channel; going forward or back turns the
// knob and the screen bursts into static before your character tunes in.
// ---------------------------------------------------------------------------
import { useRef } from "react";
import { sprite } from "../../lib/sprites";
import type { Config } from "../../lib/villager";
import { ink, reducedMotion, STEP_LABELS, useCanvasLoop, useSinceChange } from "./loop";

const SCREENS = ["#dbe8ff", "#c7d7ff", "#ffe7b8"];
const STATIC_SEC = 0.26;
const NEXT = ["", "next: your look", "next: what you do", "then you move in"];

export function ChannelSteps({ step, config }: { step: number; config: Config }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const since = useSinceChange(step);
  const knob = useRef<number | null>(null);

  useCanvasLoop(canvas, (g, W, H, dt, t) => {
    const fg = ink();
    const reduced = reducedMotion();
    const ch = Math.min(Math.max(step, 1), 3) - 1;

    // knob angle eases to the channel (-60°, 0°, 60°)
    const target = ((ch - 1) * Math.PI) / 3;
    if (knob.current === null || reduced) knob.current = target;
    knob.current += (target - knob.current) * (1 - Math.exp(-dt * 16));

    // antenna, body, feet
    g.fillStyle = fg;
    const bx = 2, by = 8, bw = W - 4, bh = H - 14;
    for (let i = 0; i < 6; i++) {
      g.fillRect(bx + bw / 2 - 2 - i * 2, by - 1 - i, 2, 1);
      g.fillRect(bx + bw / 2 + i * 2, by - 1 - i, 2, 1);
    }
    g.fillRect(bx + 2, by, bw - 4, bh);
    g.fillRect(bx, by + 2, bw, bh - 4);
    g.fillRect(bx + 8, by + bh, 6, 3);
    g.fillRect(bx + bw - 14, by + bh, 6, 3);

    // screen
    const sx = bx + 4, sy = by + 4, sw = bw - 22, sh = bh - 8;
    const noise = since(t) < STATIC_SEC && !reduced;
    if (noise) {
      for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) {
        const v = Math.floor(Math.random() * 200) + 40;
        g.fillStyle = `rgb(${v},${v},${v + 15})`;
        g.fillRect(sx + x, sy + y, 2, 2);
      }
    } else {
      g.fillStyle = SCREENS[ch];
      g.fillRect(sx, sy, sw, sh);
      // you, from the waist up at 2x, gently bobbing
      const bob = reduced ? 0 : Math.round(Math.sin(t * 3) * 0.6);
      const img = sprite(config, { dir: "down", frame: 0, blink: Math.floor(t * 10) % 34 === 0, wave: ch === 0 ? Math.floor(t * 3) % 2 : undefined });
      g.drawImage(img, 0, 0, 16, 20, sx + Math.round((sw - 32) / 2), sy + 4 + bob, 32, 40);
      // scanlines
      g.fillStyle = fg;
      g.globalAlpha = 0.12;
      for (let y = sy + 1; y < sy + sh; y += 2) g.fillRect(sx, y, sw, 1);
      g.globalAlpha = 1;
    }

    // the knob and the three channel ticks around it
    const kx = bx + bw - 9, ky = sy + 9;
    g.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      const a = ((i - 1) * Math.PI) / 3 - Math.PI / 2;
      g.globalAlpha = i === ch ? 1 : 0.35;
      g.fillRect(Math.round(kx + Math.cos(a) * 7) - 1, Math.round(ky + Math.sin(a) * 7) - 1, 2, 2);
    }
    g.globalAlpha = 1;
    g.beginPath();
    g.arc(kx, ky, 4.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = fg;
    g.lineWidth = 1.5;
    const a = knob.current - Math.PI / 2;
    g.beginPath();
    g.moveTo(kx, ky);
    g.lineTo(kx + Math.cos(a) * 4, ky + Math.sin(a) * 4);
    g.stroke();
    // speaker grille
    g.fillStyle = "#ffffff";
    g.globalAlpha = 0.35;
    for (let y = ky + 10; y < sy + sh; y += 3) g.fillRect(kx - 4, y, 8, 1);
    g.globalAlpha = 1;
  });

  const label = STEP_LABELS[Math.min(Math.max(step, 1), 3) - 1];
  return (
    <div className="flex items-center gap-4">
      <canvas ref={canvas} aria-hidden="true" className="block w-[78px] h-[66px] shrink-0" />
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[11px] opacity-60 tabular-nums">ch {step} of 3</span>
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
