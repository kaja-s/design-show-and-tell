// The character on the join form: the pixel sprite drawn big on a patch of
// sidewalk. Tap to turn it a quarter, or drag sideways and it turns with the
// finger (a quarter per TURN_PX; dragging right swings its front to the right).
// The hello move plays when it's picked.
import { petSprite, spinPose, SPIN_SEC, sprite, SPRITE_H, SPRITE_W, type Dir } from "./sprites";
import { VISITOR, type Config } from "./villager";

const DIRS: Dir[] = ["down", "left", "up", "right"];
const EMOTE_SEC = 1.6;
const TURN_PX = 32;
const SLOP_PX = 6;

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
  private drag: { id: number; x: number; dir: number; moved: boolean } | null = null;
  private dragged = false;
  // seconds since the outfit last changed: a one-pixel hop says "got it"
  private bump = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext("2d")!;
    canvas.addEventListener("click", this.turn);
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerup", this.up);
    canvas.addEventListener("pointercancel", this.up);
    this.obs = new ResizeObserver(() => this.resize());
    this.obs.observe(canvas);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }
  setConfig(c: Config) {
    if (this.config !== VISITOR && c !== this.config) this.bump = 0;
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
    this.canvas.removeEventListener("pointerdown", this.down);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerup", this.up);
    this.canvas.removeEventListener("pointercancel", this.up);
  }

  private turn = () => {
    // the click that ends a drag isn't a tap
    if (this.dragged) return void (this.dragged = false);
    this.dir = (this.dir + 1) % 4;
  };
  private down = (e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;
    this.drag = { id: e.pointerId, x: e.clientX, dir: this.dir, moved: false };
    this.dragged = false;
  };
  private move = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < SLOP_PX) return;
      d.moved = true;
      // keep getting moves if the finger slides off the canvas
      this.canvas.setPointerCapture(e.pointerId);
      this.emote = null;
    }
    this.dir = (((d.dir - Math.round(dx / TURN_PX)) % 4) + 4) % 4;
  };
  private up = (e: PointerEvent) => {
    if (e.pointerId !== this.drag?.id) return;
    this.dragged = this.drag.moved && e.type === "pointerup";
    this.drag = null;
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
    this.bump += dt;
    const t = (now - this.start) / 1000;
    if (this.emote) {
      this.emote.t += dt;
      if (this.emote.t > EMOTE_SEC) this.emote = null;
    } else if (this.loopEmote && !this.drag && t > this.nextLoop) {
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
    let frame = 0, lift = 0, squash = 1, angle = 0, wave: number | undefined;
    if (e && !this.reduced) {
      if (e.kind === "wave") wave = Math.floor(e.t * 6) % 2;
      if (e.kind === "jump") lift = Math.round(Math.abs(Math.sin((e.t / EMOTE_SEC) * Math.PI * 2)) * 5);
      if (e.kind === "spin") ({ dir, squash, angle } = spinPose(e.t / SPIN_SEC));
      if (e.kind === "jump") frame = 1;
    } else if (e?.kind === "wave") wave = 0;
    // the hop after picking something: up one pixel and back, 180ms
    if (!this.reduced && this.bump < 0.18) lift = Math.max(lift, Math.round(Math.sin((this.bump / 0.18) * Math.PI)));
    const blink = !e && Math.floor(t * 10) % 38 === 0;

    // shadow, then sprite
    g.fillStyle = dark ? "rgba(0,0,0,0.35)" : "rgba(2,16,147,0.14)";
    g.fillRect(cx - 4 * S, ground - S, 8 * S, 2 * S);
    // squash in whole sprite pixels so the turn stays on the pixel grid
    const w = Math.max(2, Math.round(SPRITE_W * squash)) * S;
    const img = sprite(this.config, { dir, frame, blink, wave });
    const body = () => g.drawImage(img, cx - Math.round(w / 2), ground - (SPRITE_H + lift) * S, w, SPRITE_H * S);

    // the pet sits to the right; during a spin it trots round with the turn,
    // passing behind on the way
    const spinning = angle > 0 && angle < Math.PI * 2;
    const pet = petSprite(this.config.pet, Math.floor(t * (spinning ? 8 : 2)), spinning && Math.sin(angle) < 0 ? "right" : "left");
    const behind = spinning && Math.sin(angle) > 0;
    const drawPet = () => {
      if (!pet) return;
      const pw = pet.width * S;
      const px = cx + Math.cos(angle) * (7 * S + pw / 2) - pw / 2;
      g.drawImage(pet, Math.round(px / S) * S, ground - pet.height * S, pw, pet.height * S);
    };
    if (behind) drawPet();
    body();
    if (!behind) drawPet();
  }
}
