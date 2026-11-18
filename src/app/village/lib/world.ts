// ---------------------------------------------------------------------------
// The village, 2d. A canvas2d engine drawing the nyc grid from map.ts with
// the pixel villagers from sprites.ts, scaled by a whole number so pixels
// stay crisp. Same public api as the old three.js world, so village-app.tsx
// only owns the html around it.
//
// modes: "explore" (/village: keys anywhere on the page), "inline" (the
// homepage footer: keys only while the canvas has focus, page scroll is left
// alone), "projector" (/village?screen: drifting camera, follows arrivals).
// ---------------------------------------------------------------------------
import {
  PALETTES, WORLD_H, WORLD_W, drawCab, drawPigeon, drawStatic, drawTall, inRect, layout, type Layout, type Palette, type TallProp,
} from "./map";
import { petSprite, sprite, SPRITE_H, SPRITE_W, type Dir } from "./sprites";
import { VISITOR, cleanConfig, type Config, type Villager } from "./villager";

export type Mode = "explore" | "projector" | "inline";
export type VillageEvents = {
  onBubble: (v: Villager | null, met: boolean) => void;
  onCard: (v: Villager | null) => void;
  onProgress: (met: number, total: number) => void;
  onArrival: (v: Villager) => void;
  onAllMet: () => void;
  onFirstFrame: () => void;
};
export type VillageEls = { canvas: HTMLCanvasElement; minimap: HTMLCanvasElement | null; bubble: HTMLElement; labels: HTMLElement };

type Pt = { x: number; y: number };
type Actor = {
  data: Villager | null; // null for the player
  cfg: Config;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  path: Pt[];
  home: Pt;
  timer: number;
  talking: boolean;
  met: boolean;
  emote: { kind: Config["emote"]; t: number } | null;
  pet: { x: number; y: number; facing: "left" | "right" } | null;
  phase: number;
  onArrive: (() => void) | null;
};

const SPEED_PLAYER = 62;
const SPEED_NPC = 20;
const TALK_DIST = 24;
const BUBBLE_DIST = 26;
const EMOTE_SEC = 1.6;
const CELL = 4;
// how much of the world to show: at least this many world px on each axis,
// so portrait phones see a useful slice too (whole-number scale either way)
const VIEW_H: Record<Mode, number> = { explore: 300, inline: 230, projector: 420 };
const VIEW_W: Record<Mode, number> = { explore: 200, inline: 190, projector: 360 };
const KEYS: Record<string, Pt> = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
};

export class Village {
  private g: CanvasRenderingContext2D;
  private L: Layout = layout();
  private pal: Palette;
  private night: boolean;
  private mode: Mode;
  private staticCanvas = document.createElement("canvas");
  private staticDirty = true;
  private occupancy: number[] = [];
  private grid: Uint8Array;
  private gw = Math.ceil(WORLD_W / CELL);
  private gh = Math.ceil(WORLD_H / CELL);
  private player: Actor;
  private villagers: Actor[] = [];
  private card: Actor | null = null;
  private bubbleFor: Actor | null = null;
  private hover: Actor | null = null;
  private keys = new Set<string>();
  private cam: Pt = { x: WORLD_W / 2, y: WORLD_H / 2 };
  private Z = 3;
  private ox = 0;
  private oy = 0;
  private zoomed = false;
  private focus: { actor: Actor; until: number } | null = null;
  private labels = new Map<string, HTMLElement>();
  private playerLabel: HTMLElement;
  private particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private marker: { x: number; y: number; t: number } | null = null;
  private pigeons: { x: number; y: number; hx: number; hy: number; fly: number; gone: number; seed: number }[];
  private cabs: { lane: number; x: number; speed: number }[];
  private raf = 0;
  private last = performance.now();
  private time = 0;
  private visible = true;
  private firstFrame = false;
  private allMetSent = false;
  private down: { x: number; y: number; t: number; id: number } | null = null;
  private cleanup: (() => void)[] = [];
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  inputEnabled = true;

  constructor(private els: VillageEls, private ev: VillageEvents, opts: { mode: Mode; night: boolean }) {
    this.g = els.canvas.getContext("2d")!;
    this.mode = opts.mode;
    this.night = opts.night;
    this.pal = PALETTES[opts.night ? "night" : "day"];
    this.staticCanvas.width = WORLD_W;
    this.staticCanvas.height = WORLD_H;
    this.grid = this.buildGrid();

    // start on the sidewalk in front of the first homes, where the first people live
    const first = this.L.buildings[0].home;
    this.player = this.makeActor(null, VISITOR, { x: first.x, y: first.y + 30 });
    this.player.dir = "down";
    this.cam = { x: this.player.x, y: this.player.y };
    this.playerLabel = this.label("you", true);
    this.pigeons = this.L.pigeons.map((p, i) => ({ x: p.x, y: p.y, hx: p.x, hy: p.y, fly: 0, gone: 0, seed: i * 1.7 }));
    this.cabs = [1, 2, 5, 6].map((lane, i) => ({ lane, x: (i * 211) % WORLD_W, speed: 34 + i * 5 }));

    this.bindInput();
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(els.canvas);
    this.cleanup.push(() => ro.disconnect());
    const io = new IntersectionObserver(([e]) => (this.visible = e.isIntersecting));
    io.observe(els.canvas);
    this.cleanup.push(() => io.disconnect());
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------------- public api ---------------- */
  dispose() {
    cancelAnimationFrame(this.raf);
    this.cleanup.forEach((f) => f());
    this.labels.forEach((l) => l.remove());
    this.playerLabel.remove();
  }

  setVillagers(list: Villager[], announce: boolean) {
    const byId = new Map(list.map((v) => [v.id, v]));
    this.villagers = this.villagers.filter((a) => byId.has(a.data!.id) || (this.card === a && (this.closeCard(), false)));
    list.forEach((v, i) => {
      const a = this.villagers.find((x) => x.data!.id === v.id);
      if (!a) this.addVillager(v, i, announce);
      else if (a.data!.updatedAt !== v.updatedAt) {
        a.data = v;
        a.cfg = cleanConfig(v.config) ?? VISITOR;
        a.pet = a.cfg.pet !== "none" ? (a.pet ?? { x: a.x + 10, y: a.y, facing: "left" }) : null;
        this.puff(a.x, a.y - 8, 16);
      }
    });
    // homes follow arrival order: three per building, then the park
    this.villagers.sort((a, b) => a.data!.createdAt - b.data!.createdAt);
    this.occupancy = this.L.buildings.map(() => 0);
    this.villagers.forEach((a, i) => {
      a.home = this.homeFor(i);
      const b = Math.floor(i / 3);
      if (b < this.occupancy.length) this.occupancy[b]++;
    });
    this.staticDirty = true;
    this.progress();
  }

  setNight(n: boolean) {
    if (n === this.night) return;
    this.night = n;
    this.pal = PALETTES[n ? "night" : "day"];
    this.staticDirty = true;
  }

  setMode(m: Mode) {
    this.mode = m;
    if (m === "projector") this.closeCard();
    this.resize();
  }

  setZoom(z: number) {
    this.zoomed = z > 0.5;
    this.resize();
  }

  closeCard() {
    if (this.card) {
      this.card.talking = false;
      this.card.timer = 1.5;
    }
    this.card = null;
    this.ev.onCard(null);
  }

  // Walk to the nearest person you haven't met. Returns false when there's nobody left.
  findNew() {
    let best: Actor | null = null, bd = Infinity;
    for (const a of this.villagers) {
      if (a.met || a === this.card) continue;
      const d = Math.hypot(a.x - this.player.x, a.y - this.player.y);
      if (d < bd) { bd = d; best = a; }
    }
    if (!best) return false;
    this.closeCard();
    this.zoomed = false;
    this.resize();
    this.walkTo(best);
    return true;
  }

  // Jump next to someone and say hi (from the directory, or ?me= after joining).
  visit(id: string) {
    const a = this.villagers.find((x) => x.data!.id === id);
    if (!a) return false;
    const spots = [{ x: 14, y: 2 }, { x: -14, y: 2 }, { x: 0, y: 12 }, { x: 0, y: -10 }];
    const s = spots.map((o) => ({ x: a.x + o.x, y: a.y + o.y })).find((p) => !this.blocked(p.x, p.y)) ?? { x: a.x, y: a.y + 12 };
    this.player.x = s.x;
    this.player.y = s.y;
    this.player.path = [];
    this.cam = { x: s.x, y: s.y };
    this.zoomed = false;
    this.resize();
    this.sayHi(a);
    return true;
  }

  talkToBubble() {
    if (this.bubbleFor) this.talkOrWalk(this.bubbleFor);
  }

  /* ---------------- villagers ---------------- */
  private makeActor(data: Villager | null, raw: unknown, at: Pt): Actor {
    const cfg = cleanConfig(raw) ?? VISITOR;
    return {
      data, cfg, x: at.x, y: at.y, dir: "down", moving: false, path: [], home: { ...at }, timer: Math.random() * 4, talking: false, met: false,
      emote: null, pet: cfg.pet !== "none" ? { x: at.x + 10, y: at.y, facing: "left" } : null, phase: Math.random() * 10, onArrive: null,
    };
  }

  private homeFor(i: number): Pt {
    const b = this.L.buildings[Math.floor(i / 3)];
    if (b) {
      const slot = [{ x: -10, y: 4 }, { x: 10, y: 6 }, { x: 0, y: 14 }][i % 3];
      return { x: b.home.x + slot.x, y: b.home.y + slot.y };
    }
    // more people than apartments: they hang out in the park
    const pk = this.L.park, k = i * 37;
    for (let n = 0; n < 20; n++) {
      const p = { x: pk.x + 12 + ((k + n * 53) % (pk.w - 24)), y: pk.y + 12 + ((k * 3 + n * 29) % (pk.h - 24)) };
      if (!this.blocked(p.x, p.y)) return p;
    }
    return { x: pk.x + pk.w / 2, y: pk.y + pk.h - 10 };
  }

  private addVillager(v: Villager, index: number, announce: boolean) {
    const home = this.homeFor(index);
    if (!announce) {
      const a = this.makeActor(v, v.config, home);
      this.villagers.push(a);
      return;
    }
    // new arrivals come up the subway stairs and walk home
    const a = this.makeActor(v, v.config, this.L.subway.spawn);
    a.home = home;
    a.emote = { kind: "jump", t: 0 };
    a.timer = 1.2;
    this.villagers.push(a);
    this.puff(a.x, a.y - 8, 40);
    const l = this.label(v.name);
    this.labels.set(v.id, l);
    window.setTimeout(() => {
      l.remove();
      this.labels.delete(v.id);
    }, 9000);
    window.setTimeout(() => {
      if (!a.talking) a.path = this.route(a, home);
    }, 1300);
    this.focus = { actor: a, until: this.time + 7 };
    this.ev.onArrival(v);
  }

  private progress() {
    const met = this.villagers.filter((a) => a.met).length;
    this.ev.onProgress(met, this.villagers.length);
    if (met > 0 && met === this.villagers.length && !this.allMetSent) {
      this.allMetSent = true;
      this.ev.onAllMet();
    }
  }

  private sayHi(a: Actor) {
    if (this.card && this.card !== a) this.card.talking = false;
    this.card = a;
    a.talking = true;
    a.path = [];
    a.moving = false;
    a.dir = this.facing(a, this.player);
    this.player.dir = this.facing(this.player, a);
    this.player.path = [];
    a.emote = { kind: a.cfg.emote, t: 0 };
    if (!a.met) {
      a.met = true;
      this.progress();
    }
    this.ev.onCard(a.data);
  }

  private talkOrWalk(a: Actor) {
    if (Math.hypot(a.x - this.player.x, a.y - this.player.y) <= TALK_DIST) this.sayHi(a);
    else this.walkTo(a);
  }

  private walkTo(a: Actor) {
    const side = this.player.x < a.x ? -12 : 12;
    const goal = [{ x: a.x + side, y: a.y + 2 }, { x: a.x - side, y: a.y + 2 }, { x: a.x, y: a.y + 12 }].find((p) => !this.blocked(p.x, p.y)) ?? { x: a.x, y: a.y + 12 };
    this.player.path = this.route(this.player, goal);
    this.player.onArrive = () => this.sayHi(a);
  }

  private facing(from: Pt, to: Pt): Dir {
    const dx = to.x - from.x, dy = to.y - from.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }

  /* ---------------- grid + paths ---------------- */
  private buildGrid() {
    const g = new Uint8Array(this.gw * this.gh);
    for (let cy = 0; cy < this.gh; cy++) for (let cx = 0; cx < this.gw; cx++) {
      const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2;
      if (this.L.solids.some((r) => inRect(r, x, y, 3))) g[cy * this.gw + cx] = 1;
    }
    return g;
  }
  private blocked(x: number, y: number) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= this.gw || cy >= this.gh) return true;
    return this.grid[cy * this.gw + cx] === 1;
  }
  // Breadth-first search on the grid; returns waypoints (corners only).
  private route(from: Pt, to: Pt): Pt[] {
    const gw = this.gw, gh = this.gh;
    const s = Math.floor(from.y / CELL) * gw + Math.floor(from.x / CELL);
    let t = Math.floor(to.y / CELL) * gw + Math.floor(to.x / CELL);
    if (t < 0 || t >= gw * gh) return [];
    if (this.grid[t]) {
      // aim for the nearest open cell instead
      let best = -1, bd = Infinity;
      const tx = t % gw, ty = Math.floor(t / gw);
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || this.grid[ny * gw + nx]) continue;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = ny * gw + nx; }
      }
      if (best < 0) return [];
      t = best;
      to = { x: (t % gw) * CELL + CELL / 2, y: Math.floor(t / gw) * CELL + CELL / 2 };
    }
    const prev = new Int32Array(gw * gh).fill(-1);
    prev[s] = s;
    const q = new Int32Array(gw * gh);
    let qh = 0, qt = 0;
    q[qt++] = s;
    while (qh < qt) {
      const c = q[qh++];
      if (c === t) break;
      const cx = c % gw, cy = (c - cx) / gw;
      const nbrs = [cx > 0 ? c - 1 : -1, cx < gw - 1 ? c + 1 : -1, cy > 0 ? c - gw : -1, cy < gh - 1 ? c + gw : -1];
      for (const n of nbrs) if (n >= 0 && prev[n] < 0 && !this.grid[n]) { prev[n] = c; q[qt++] = n; }
    }
    if (prev[t] < 0) return [];
    const cells: number[] = [];
    for (let c = t; c !== s; c = prev[c]) cells.push(c);
    cells.reverse();
    // keep only the corners, then smooth with line-of-sight
    const pts = cells.map((c) => ({ x: (c % gw) * CELL + CELL / 2, y: Math.floor(c / gw) * CELL + CELL / 2 }));
    pts[pts.length - 1] = { ...to };
    const out: Pt[] = [];
    let anchor: Pt = from;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[i + 1];
      if (next && this.clear(anchor, next)) continue;
      out.push(pts[i]);
      anchor = pts[i];
    }
    return out;
  }
  private clear(a: Pt, b: Pt) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
    for (let i = 1; i <= n; i++) if (this.blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
    return true;
  }

  /* ---------------- input ---------------- */
  private bindInput() {
    const c = this.els.canvas;
    const isField = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    };
    const onButton = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && t !== c && (t.tagName === "BUTTON" || t.tagName === "A");
    };
    const onDown = (e: KeyboardEvent) => {
      if (!this.inputEnabled || this.mode === "projector" || isField(e)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (KEYS[k]) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        this.keys.add(k);
        this.player.path = [];
        this.player.onArrive = null;
        if (this.card && Math.hypot(this.card.x - this.player.x, this.card.y - this.player.y) > 4) this.closeCard();
      } else if ((k === "Enter" || k === " ") && !onButton(e)) {
        if (this.bubbleFor) {
          e.preventDefault();
          this.talkToBubble();
        }
      }
    };
    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    // inline (homepage): the app turns input on only once the tv is open on screen
    const target: Window = window;
    target.addEventListener("keydown", onDown as unknown as EventListener);
    target.addEventListener("keyup", onUp as unknown as EventListener);
    const onBlur = () => this.keys.clear();
    window.addEventListener("blur", onBlur);
    if (this.mode === "inline") c.addEventListener("blur", onBlur);

    const onPointerDown = (e: PointerEvent) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    };
    const onPointerUp = (e: PointerEvent) => {
      const d = this.down;
      this.down = null;
      if (!d || d.id !== e.pointerId || !this.inputEnabled || this.mode === "projector") return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 600) return;
      this.tap(this.toWorld(e.clientX, e.clientY));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || this.mode === "projector") return;
      const w = this.toWorld(e.clientX, e.clientY);
      this.hover = this.actorAt(w);
      c.style.cursor = this.hover ? "pointer" : "";
    };
    const onLeave = () => {
      this.hover = null;
      c.style.cursor = "";
    };
    c.addEventListener("pointerdown", onPointerDown);
    c.addEventListener("pointerup", onPointerUp);
    c.addEventListener("pointercancel", () => (this.down = null));
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerleave", onLeave);

    const mm = this.els.minimap;
    const onMini = (e: PointerEvent) => {
      if (!mm || !this.inputEnabled) return;
      const r = mm.getBoundingClientRect();
      const s = Math.min(r.width / WORLD_W, r.height / WORLD_H);
      const ox = (r.width - WORLD_W * s) / 2, oy = (r.height - WORLD_H * s) / 2;
      this.closeCard();
      this.zoomed = false;
      this.resize();
      this.player.path = this.route(this.player, { x: (e.clientX - r.left - ox) / s, y: (e.clientY - r.top - oy) / s });
      this.player.onArrive = null;
    };
    mm?.addEventListener("pointerdown", onMini);

    this.cleanup.push(() => {
      target.removeEventListener("keydown", onDown as unknown as EventListener);
      target.removeEventListener("keyup", onUp as unknown as EventListener);
      window.removeEventListener("blur", onBlur);
      c.removeEventListener("blur", onBlur);
      c.removeEventListener("pointerdown", onPointerDown);
      c.removeEventListener("pointerup", onPointerUp);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerleave", onLeave);
      mm?.removeEventListener("pointerdown", onMini);
    });
  }

  private toWorld(clientX: number, clientY: number): Pt {
    const r = this.els.canvas.getBoundingClientRect();
    const k = this.els.canvas.width / r.width;
    return { x: ((clientX - r.left) * k - this.ox) / this.Z, y: ((clientY - r.top) * k - this.oy) / this.Z };
  }
  private actorAt(w: Pt): Actor | null {
    let hit: Actor | null = null;
    for (const a of this.villagers) {
      if (w.x >= a.x - 7 && w.x <= a.x + 7 && w.y >= a.y - SPRITE_H - 1 && w.y <= a.y + 1) if (!hit || a.y > hit.y) hit = a;
    }
    return hit;
  }
  private tap(w: Pt) {
    if (this.zoomed) {
      this.zoomed = false;
      this.resize();
    }
    const a = this.actorAt(w);
    if (a) return this.talkOrWalk(a);
    if (this.card) this.closeCard();
    this.player.path = this.route(this.player, w);
    this.player.onArrive = null;
    const end = this.player.path[this.player.path.length - 1];
    if (end) this.marker = { x: end.x, y: end.y, t: this.time };
  }

  /* ---------------- frame ---------------- */
  private resize() {
    const c = this.els.canvas;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(c.clientWidth * dpr));
    c.height = Math.max(1, Math.round(c.clientHeight * dpr));
    if (this.zoomed) this.Z = Math.min(c.width / WORLD_W, c.height / WORLD_H);
    else this.Z = Math.max(1, Math.round(Math.min(c.height / VIEW_H[this.mode], c.width / VIEW_W[this.mode])));
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.visible || document.hidden) return;
    this.time += dt;
    this.update(dt);
    this.draw();
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.ev.onFirstFrame();
    }
  };

  private step(a: Actor, dt: number, speed: number) {
    const target = a.path[0];
    if (!target) {
      a.moving = false;
      return;
    }
    const dx = target.x - a.x, dy = target.y - a.y, d = Math.hypot(dx, dy);
    const s = speed * dt;
    if (d <= s) {
      a.x = target.x;
      a.y = target.y;
      a.path.shift();
      if (!a.path.length) {
        a.moving = false;
        const done = a.onArrive;
        a.onArrive = null;
        done?.();
      }
    } else {
      a.x += (dx / d) * s;
      a.y += (dy / d) * s;
      a.moving = true;
      a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    }
  }

  private update(dt: number) {
    const p = this.player;
    // keys
    let kx = 0, ky = 0;
    this.keys.forEach((k) => { kx += KEYS[k]?.x ?? 0; ky += KEYS[k]?.y ?? 0; });
    if (kx || ky) {
      const len = Math.hypot(kx, ky), s = SPEED_PLAYER * dt;
      const nx = p.x + (kx / len) * s, ny = p.y + (ky / len) * s;
      if (!this.blocked(nx, p.y)) p.x = nx;
      if (!this.blocked(p.x, ny)) p.y = ny;
      p.dir = Math.abs(kx) > Math.abs(ky) ? (kx > 0 ? "right" : "left") : ky > 0 ? "down" : "up";
      p.moving = true;
    } else this.step(p, dt, SPEED_PLAYER);
    p.phase += dt;
    this.followPet(p, dt);

    // villagers: wander near home, stop to talk
    for (const a of this.villagers) {
      a.phase += dt;
      if (a.emote) {
        a.emote.t += dt;
        if (a.emote.t > EMOTE_SEC) a.emote = null;
      }
      if (a.talking) {
        a.dir = this.facing(a, p);
        a.moving = false;
      } else {
        a.timer -= dt;
        if (!a.path.length && a.timer <= 0) {
          a.timer = 3 + Math.random() * 6;
          const far = Math.hypot(a.x - a.home.x, a.y - a.home.y) > 40;
          if (far) a.path = this.route(a, a.home);
          else {
            const goal = { x: a.home.x + (Math.random() - 0.5) * 50, y: a.home.y + (Math.random() - 0.3) * 30 };
            if (!this.blocked(goal.x, goal.y) && this.clear(a, goal)) a.path = [goal];
            else a.dir = (["down", "left", "right", "down"] as Dir[])[Math.floor(Math.random() * 4)];
          }
        }
        this.step(a, dt, SPEED_NPC);
      }
      this.followPet(a, dt);
    }

    // talking ends when you walk away
    if (this.card && Math.hypot(this.card.x - p.x, this.card.y - p.y) > TALK_DIST * 2.2) this.closeCard();

    // who gets the bubble: the hovered person, else the nearest one close by
    let near: Actor | null = this.hover;
    if (!near && this.mode !== "projector") {
      let bd = BUBBLE_DIST;
      for (const a of this.villagers) {
        const d = Math.hypot(a.x - p.x, a.y - p.y);
        if (d < bd) { bd = d; near = a; }
      }
    }
    if (this.card) near = null;
    if (near !== this.bubbleFor) {
      this.bubbleFor = near;
      this.ev.onBubble(near?.data ?? null, !!near?.met);
    }

    // traffic, pigeons, particles
    for (const c of this.cabs) {
      const lane = this.L.cabLanes[c.lane];
      c.x += lane.dir * c.speed * dt;
      if (c.x > WORLD_W + 30) c.x = -30;
      if (c.x < -30) c.x = WORLD_W + 30;
    }
    for (const b of this.pigeons) {
      if (b.gone > 0) {
        b.gone -= dt;
        if (b.gone <= 0) { b.x = b.hx; b.y = b.hy; b.fly = 0; }
        continue;
      }
      if (b.fly > 0) {
        b.fly += dt;
        b.x += 70 * dt;
        b.y -= 55 * dt;
        if (b.fly > 2) b.gone = 10;
      } else if (Math.hypot(b.x - p.x, b.y - p.y) < 18 || this.villagers.some((a) => a.moving && Math.hypot(b.x - a.x, b.y - a.y) < 12)) b.fly = 0.001;
    }
    this.particles = this.particles.filter((q) => (q.life -= dt) > 0);
    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 30 * dt;
    }

    // camera
    const c = this.els.canvas;
    const viewW = c.width / this.Z, viewH = c.height / this.Z;
    let target: Pt;
    if (this.focus && this.time < this.focus.until && this.mode === "projector") target = this.focus.actor;
    else if (this.mode === "projector") {
      const t = this.time * 0.035;
      target = { x: WORLD_W / 2 + Math.sin(t) * (WORLD_W / 2 - viewW / 2), y: WORLD_H / 2 + Math.sin(t * 1.37) * (WORLD_H / 2 - viewH / 2) };
    } else target = { x: p.x, y: p.y - 10 };
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * (this.mode === "projector" ? 1.5 : 6));
    this.cam.x += (target.x - this.cam.x) * k;
    this.cam.y += (target.y - this.cam.y) * k;
    const clampAxis = (v: number, view: number, world: number) => (view >= world ? world / 2 : Math.min(world - view / 2, Math.max(view / 2, v)));
    this.cam.x = clampAxis(this.cam.x, viewW, WORLD_W);
    this.cam.y = clampAxis(this.cam.y, viewH, WORLD_H);
  }

  private followPet(a: Actor, dt: number) {
    if (!a.pet) return;
    const pet = a.pet;
    const tx = a.x + (a.dir === "left" ? 10 : -10), ty = a.y + 1;
    const d = Math.hypot(tx - pet.x, ty - pet.y);
    if (d > 3) {
      const s = Math.min(d, (a === this.player ? SPEED_PLAYER : SPEED_NPC + 10) * 1.1 * dt);
      pet.facing = tx < pet.x ? "left" : "right";
      pet.x += ((tx - pet.x) / d) * s;
      pet.y += ((ty - pet.y) / d) * s;
    }
  }

  private puff(x: number, y: number, n: number) {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 15 + Math.random() * 35;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.6 });
    }
  }

  private draw() {
    const { g } = this;
    const c = this.els.canvas, p = this.pal, Z = this.Z;
    if (this.staticDirty) {
      drawStatic(this.staticCanvas.getContext("2d")!, p, this.occupancy);
      this.staticDirty = false;
    }
    this.ox = Math.round(c.width / 2 - this.cam.x * Z);
    this.oy = Math.round(c.height / 2 - this.cam.y * Z);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = p.asphalt;
    g.fillRect(0, 0, c.width, c.height);
    g.setTransform(Z, 0, 0, Z, this.ox, this.oy);
    g.drawImage(this.staticCanvas, 0, 0);

    // where you tapped: a little target that shrinks away
    if (this.marker) {
      const age = this.time - this.marker.t;
      if (age > 0.7 || !this.player.path.length) this.marker = null;
      else {
        const r = Math.max(1, Math.round(5 * (1 - age / 0.7)));
        const mx = Math.round(this.marker.x), my = Math.round(this.marker.y);
        g.fillStyle = p.night ? "#93c5fd" : "#3b5bdb";
        g.fillRect(mx - r, my - 1, 2, 2);
        g.fillRect(mx + r - 1, my - 1, 2, 2);
        g.fillRect(mx - 1, my - r, 2, 2);
        g.fillRect(mx - 1, my + r - 1, 2, 2);
      }
    }

    // pigeons on the ground
    for (const b of this.pigeons) if (b.gone <= 0 && b.fly === 0) drawPigeon(g, p, Math.round(b.x), Math.round(b.y), Math.floor(this.time * 3 + b.seed) % 5 === 0, false);

    // everything that can overlap, sorted by where it touches the ground
    type D = { y: number; draw: () => void };
    const list: D[] = [];
    for (const t of this.L.tall) list.push({ y: t.y, draw: () => drawTall(g, p, t as TallProp, this.time) });
    for (const cab of this.cabs) {
      const lane = this.L.cabLanes[cab.lane];
      list.push({ y: lane.y + 10, draw: () => drawCab(g, p, Math.round(cab.x), lane.y, lane.dir, Math.floor(this.time * 4)) });
    }
    for (const a of this.villagers) list.push({ y: a.y, draw: () => this.drawActor(a) });
    if (this.mode !== "projector") list.push({ y: this.player.y, draw: () => this.drawActor(this.player) });
    list.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    if (this.bubbleFor && !this.card && this.mode !== "projector") this.drawSpeech(this.bubbleFor);

    for (const b of this.pigeons) if (b.gone <= 0 && b.fly > 0) drawPigeon(g, p, Math.round(b.x), Math.round(b.y), false, true);
    g.fillStyle = p.night ? "#ffffff" : "#93c5fd";
    for (const q of this.particles) g.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);

    this.placeHtml();
    if (Math.floor(this.time * 10) % 3 === 0) this.drawMinimap();
  }

  private drawActor(a: Actor) {
    const { g } = this;
    const e = a.emote;
    let dir = a.dir, lift = 0, wave: number | undefined;
    if (e && !this.reduced) {
      if (e.kind === "wave") wave = Math.floor(e.t * 6) % 2;
      else if (e.kind === "jump") lift = Math.round(Math.abs(Math.sin((e.t / EMOTE_SEC) * Math.PI * 2)) * 4);
      else if (e.kind === "spin") dir = (["down", "left", "up", "right"] as Dir[])[Math.floor(e.t * 8) % 4];
    }
    const frame = a.moving ? Math.floor(a.phase * 8) % 4 : 0;
    const blink = !a.moving && Math.floor(a.phase * 10) % 41 === 0;
    const x = Math.round(a.x), y = Math.round(a.y);
    g.fillStyle = this.pal.shadow;
    g.fillRect(x - 4, y - 1, 8, 2);
    if (a.pet) {
      const img = petSprite(a.cfg.pet, a.moving ? Math.floor(a.phase * 6) : 0, a.pet.facing);
      if (img) {
        g.fillRect(Math.round(a.pet.x) - 4, Math.round(a.pet.y) - 1, 8, 2);
        g.drawImage(img, Math.round(a.pet.x) - 5, Math.round(a.pet.y) - img.height);
      }
    }
    g.drawImage(sprite(a.cfg, { dir, frame, blink, wave }), x - SPRITE_W / 2, y - SPRITE_H - lift);
    // a small marker over people you've met
    if (a.met && a.data && !a.talking) {
      g.fillStyle = this.pal.night ? "#93c5fd" : "#3b5bdb";
      g.fillRect(x - 1, y - SPRITE_H - 4, 3, 1);
      g.fillRect(x, y - SPRITE_H - 5, 1, 3);
    }
  }

  // screen position (css px, relative to the canvas) of a world point
  private screen(x: number, y: number) {
    const c = this.els.canvas;
    const k = c.clientWidth / c.width;
    const sx = (x * this.Z + this.ox) * k, sy = (y * this.Z + this.oy) * k;
    return { x: sx, y: sy, ok: sx > -40 && sy > -40 && sx < c.clientWidth + 40 && sy < c.clientHeight + 40 };
  }

  private placeHtml() {
    for (const [id, el] of this.labels) {
      const a = this.villagers.find((v) => v.data!.id === id);
      if (!a) continue;
      const s = this.screen(a.x, a.y - SPRITE_H - 1);
      el.style.display = s.ok ? "" : "none";
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
    }
    const pl = this.screen(this.player.x, this.player.y - SPRITE_H - 1);
    const showYou = this.mode !== "projector" && pl.ok && !this.card;
    this.playerLabel.style.display = showYou ? "" : "none";
    if (showYou) this.playerLabel.style.transform = `translate(${pl.x}px, ${pl.y}px) translate(-50%, -100%)`;
  }

  // the "…" speech bubble over whoever you can talk to
  private drawSpeech(a: Actor) {
    const { g } = this;
    const bob = this.reduced ? 0 : Math.round(Math.sin(this.time * 4) * 0.6);
    const x = Math.round(a.x) - 1, y = Math.round(a.y) - SPRITE_H - 12 + bob;
    const ink = "#1b1d33";
    g.fillStyle = ink;
    g.fillRect(x, y, 13, 9);
    g.fillStyle = "#ffffff";
    g.fillRect(x + 1, y + 1, 11, 7);
    g.fillStyle = ink;
    g.fillRect(x + 1, y + 9, 2, 2);
    g.fillRect(x + 1, y + 11, 1, 1);
    g.fillStyle = "#ffffff";
    g.fillRect(x + 1, y + 8, 2, 1);
    const n = this.reduced ? 3 : 1 + (Math.floor(this.time * 3) % 3);
    g.fillStyle = ink;
    for (let i = 0; i < n; i++) g.fillRect(x + 3 + i * 3, y + 4, 2, 2);
  }

  private drawMinimap() {
    const mm = this.els.minimap;
    if (!mm) return;
    const g = mm.getContext("2d")!;
    const s = Math.min(mm.width / WORLD_W, mm.height / WORLD_H);
    const ox = (mm.width - WORLD_W * s) / 2, oy = (mm.height - WORLD_H * s) / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, mm.width, mm.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.staticCanvas, ox, oy, WORLD_W * s, WORLD_H * s);
    for (const a of this.villagers) {
      g.fillStyle = a.met ? "#3b5bdb" : "#d9453b";
      g.fillRect(ox + a.x * s - 3, oy + a.y * s - 3, 6, 6);
    }
    g.fillStyle = "#021093";
    g.fillRect(ox + this.player.x * s - 5, oy + this.player.y * s - 5, 10, 10);
    g.fillStyle = "#ffffff";
    g.fillRect(ox + this.player.x * s - 2, oy + this.player.y * s - 2, 4, 4);
  }

  private label(text: string, you = false) {
    const el = document.createElement("div");
    el.className = "village-label" + (you ? " is-you" : "");
    el.textContent = text;
    el.style.display = "none";
    this.els.labels.append(el);
    return el;
  }
}
