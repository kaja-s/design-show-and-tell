// Halftone confetti: a one-shot burst of dots in the site's colours, drawn on
// a throwaway full-screen canvas. No dependencies. Skipped under
// prefers-reduced-motion. Call burstConfetti(x, y) with viewport coordinates.

const COUNT = 90;
const DURATION_MS = 1600;
const GRAVITY = 0.0022; // px per ms²
const DRAG = 0.0009;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  spin: number;
  square: boolean;
};

function siteColors() {
  const cs = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return [pick("--foreground", "#021093"), pick("--accent", "#3b5bdb"), pick("--highlight", "#021093")];
}

export function burstConfetti(x: number, y: number) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9998", // under the noise overlay, over everything else
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const colors = siteColors();
  const particles: Particle[] = Array.from({ length: COUNT }, (_, i) => {
    // mostly upward, fanned ±70°, with a wide spread of speeds
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.8);
    const speed = 0.25 + Math.random() * 0.55; // px per ms
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.5 + Math.random() * 3.5,
      color: colors[i % colors.length],
      spin: (Math.random() - 0.5) * 0.02,
      square: Math.random() < 0.2,
    };
  });

  let last = performance.now();
  const start = last;

  const frame = (now: number) => {
    const dt = Math.min(now - last, 40);
    last = now;
    const t = (now - start) / DURATION_MS;
    if (t >= 1) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // fade everything out over the last 35%
    ctx.globalAlpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;

    for (const p of particles) {
      p.vy += GRAVITY * dt;
      p.vx *= 1 - DRAG * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = p.color;
      if (p.square) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(now * p.spin);
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
