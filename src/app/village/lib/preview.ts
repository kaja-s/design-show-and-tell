// The character on the join form: the pixel sprite drawn big on a patch of
// sidewalk. Tap to turn it around; the hello move plays when it's picked.
import { petSprite, sprite, SPRITE_H, SPRITE_W, type Dir } from "./sprites";
import { VISITOR, type Config } from "./villager";

const DIRS: Dir[] = ["down", "left", "up", "right"];
const EMOTE_SEC = 1.6;

export class Preview {
  private g: CanvasRenderingContext2D;
  private config: Config = VISITOR;
  private dir = 0;
  private emote: { kind: Config["emote"]; t: number } | null = null;
  private raf = 0;
  private start = performance.now();
  private nextLoop = 2;
  private obs: ResizeObserver;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Repeat the hello move every few seconds (welcome and done screens).
  loopEmote = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext("2d")!;
    canvas.addEventListener("click", this.turn);
    this.obs = new ResizeObserver(() => this.resize());
    this.obs.observe(canvas);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }
  setConfig(c: Config) {
    this.config = c;
  }
  playEmote(kind: Config["emote"]) {
    this.emote = { kind, t: 0 };
    this.dir = 0;
  }
  spin() {
    this.playEmote("spin");
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    this.obs.disconnect();
    this.canvas.removeEventListener("click", this.turn);
  }

  private turn = () => {
    this.dir = (this.dir + 1) % 4;
  };
  private resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
  }
  private last = performance.now();
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const t = (now - this.start) / 1000;
    if (this.emote) {
      this.emote.t += dt;
      if (this.emote.t > EMOTE_SEC) this.emote = null;
    } else if (this.loopEmote && t > this.nextLoop) {
      this.nextLoop = t + 4.5;
      this.playEmote(this.config.emote);
    }
    this.draw(t);
  };

  private draw(t: number) {
    const { g, canvas } = this;
    const W = canvas.width, H = canvas.height;
    const dark = document.documentElement.classList.contains("dark");
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;

    // scale: the sprite fills ~70% of the height, in whole pixels
    const S = Math.max(2, Math.floor((H * 0.7) / SPRITE_H));
    const cx = Math.round(W / 2), ground = Math.round(H * 0.86);

    // a patch of sidewalk
    const tile = S * 6;
    const pw = Math.min(W, tile * 9), ph = S * 10;
    const px = Math.round(cx - pw / 2), py = ground - ph / 2;
    g.fillStyle = dark ? "#16275e" : "#f1f4fc";
    g.fillRect(px, py, pw, ph);
    g.fillStyle = dark ? "#1c2f6b" : "#e0e6f6";
    for (let x = px; x <= px + pw; x += tile * 2) g.fillRect(x, py, S, ph);
    g.fillRect(px, py + ph / 2, pw, S);
    g.fillStyle = dark ? "#08112f" : "#a9b8e2";
    g.fillRect(px, py + ph, pw, S);

    // pose
    const e = this.emote;
    let dir: Dir = DIRS[this.dir];
    let frame = 0, lift = 0, wave: number | undefined;
    if (e && !this.reduced) {
      if (e.kind === "wave") wave = Math.floor(e.t * 6) % 2;
      if (e.kind === "jump") lift = Math.round(Math.abs(Math.sin((e.t / EMOTE_SEC) * Math.PI * 2)) * 5);
      if (e.kind === "spin") dir = DIRS[Math.floor(e.t * 8) % 4];
      if (e.kind === "jump") frame = 1;
    } else if (e?.kind === "wave") wave = 0;
    const blink = !e && Math.floor(t * 10) % 38 === 0;

    // shadow, then sprite
    g.fillStyle = dark ? "rgba(0,0,0,0.35)" : "rgba(2,16,147,0.14)";
    g.fillRect(cx - 4 * S, ground - S, 8 * S, 2 * S);
    const img = sprite(this.config, { dir, frame, blink, wave });
    g.drawImage(img, cx - (SPRITE_W / 2) * S, ground - (SPRITE_H + lift) * S, SPRITE_W * S, SPRITE_H * S);

    const pet = petSprite(this.config.pet, Math.floor(t * 2), "left");
    if (pet) g.drawImage(pet, cx + 7 * S, ground - pet.height * S, pet.width * S, pet.height * S);
  }
}
