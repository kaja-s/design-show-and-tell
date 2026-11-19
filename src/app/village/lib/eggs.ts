// ---------------------------------------------------------------------------
// Easter eggs for designers. Where they are, how they draw, and their state;
// world.ts calls in. Placement is derived from the fixed-seed layout, so
// they're always in the same spots:
//
// - the kerning shop: the sign over the nearest shop reads K E R N I N G with
//   awful spacing; stand in front of it and it slowly kerns itself (and
//   slowly lets go again once you leave)
// - the lorem ipsum café: the next shop, with a placeholder menu board and a
//   barista who is waiting on the real copy
// - a pantone fire hydrant: click it to cycle through swatches
// - the 8px grid: press g; one building is a pixel off and blinks red
// - comic sans graffiti on a far wall, only there when you walk up to it
//   (never on the minimap or the zoomed-out view)
// - the final_v3_FINAL mailbox (a file stack) and a mailbox for letters to
//   kaja, which the ui opens
// - a client who only asks for a bigger logo; the billboard on the roof obliges
// - type "figma": everyone gets a multiplayer cursor trailing behind them
// - an open-air cinema at the top of the park looping the event's slides
// ---------------------------------------------------------------------------
import { BX, BY, ST, blockX, blockY, layout, type Building, type Palette, type Rect } from "./map";
import { VISITOR, type Config } from "./villager";
import { EVENT, HOSTS, SPEAKERS, SPONSOR } from "../../slides/deck";

type G = CanvasRenderingContext2D;
type Pt = { x: number; y: number };
const R = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
function darken(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

export type SpotId = "barista" | "client" | "menu" | "hydrant" | "files" | "letter";
// Something you can walk up to and use: x/y is where it touches the ground.
export type Spot = { id: SpotId; x: number; y: number; hit: Rect; text: string };

export const BARISTA: Config = { ...VISITOR, skin: "#c68863", hair: "bun", hairColor: "#2b1d16", top: "tee", topColor: "#3f6b4f", pants: "#262a40", hat: "none", extra: "none", carry: "coffee", emote: "wave" };
export const CLIENT: Config = { ...VISITOR, skin: "#f0c8a8", hair: "short", hairColor: "#9aa0a6", top: "jacket", topColor: "#262a40", pants: "#262a40", hat: "none", extra: "glasses", carry: "laptop", emote: "jump" };

export const SWATCHES: [string, string][] = [
  ["pms 485 c", "#da291c"], ["pms 2728 c", "#0047bb"], ["pms 7548 c", "#ffc600"], ["pms 3415 c", "#007749"],
  ["very peri 17-3938", "#6667ab"], ["classic blue 19-4052", "#0f4c81"], ["viva magenta 18-1750", "#bb2649"],
  ["peach fuzz 13-1023", "#ffbe98"], ["mocha mousse 17-1230", "#a47864"],
];
export const MENU = "lorem ipsum … 3,50 · dolor sit amet … 4,00 · consectetur (oat) … 4,50";
export const BARISTA_LINE = "sorry, the real copy is coming next sprint.";
export const CLIENT_LINE = "can you make the logo bigger?";

export type EggLayout = {
  kerning: Building;
  cafe: Building;
  nudged: Building;
  graffiti: Building;
  hydrant: Pt;
  letterBox: Pt;
  filesBox: Pt;
  menu: Pt;
  billboard: Rect;
  barista: Pt;
  client: Pt;
  cinema: Rect;
  spots: Spot[];
};

const blockOf = (b: Building) => ({ i: Math.floor((b.x - ST) / (BX + ST)), j: Math.floor((b.rear - ST) / (BY + ST)) });
const baseOf = (j: number) => blockY(j) + 92;

let cached: EggLayout | null = null;
// Picks the spots and adds their footprints to the layout's solids (once,
// before the world builds its walk grid).
export function eggLayout(): EggLayout {
  if (cached) return cached;
  const L = layout();
  const shops = L.buildings.filter((b) => b.kind === "shop");
  const homes = L.buildings.filter((b) => b.kind !== "shop");
  const kerning = shops[0], cafe = shops[1] ?? shops[0];
  const nudged = homes[0];
  nudged.nudge = true;
  const graffiti = homes[homes.length - 1];

  // the start block (where you arrive) gets the letters mailbox
  const start = blockOf(L.buildings[0]);
  const letterBox = { x: blockX(start.i) + 10, y: baseOf(start.j) + 24 };
  const filesBlock = start.i === 0 && start.j === 0 ? { i: 2, j: 0 } : { i: 0, j: 0 };
  const filesBox = { x: blockX(filesBlock.i) + 10, y: baseOf(filesBlock.j) + 24 };

  const hydrant = L.small
    .filter((s) => s.kind === "hydrant")
    .sort((a, b) => Math.hypot(a.x - L.buildings[0].home.x, a.y - L.buildings[0].home.y) - Math.hypot(b.x - L.buildings[0].home.x, b.y - L.buildings[0].home.y))[0];

  const menu = { x: cafe.x + cafe.w - 15, y: cafe.base + 16 };
  const barista = { x: cafe.x + 9, y: cafe.base + 10 };

  // the billboard: on the roof of the widest home in the block left of the park
  const left = L.buildings.filter((b) => b.kind !== "shop" && blockOf(b).i === 0 && blockOf(b).j === 1).sort((a, b) => b.w - a.w)[0] ?? homes[1];
  const bw = Math.min(left.w - 6, 44);
  const billboard = { x: left.x + Math.round((left.w - bw) / 2), y: left.rear - 13, w: bw, h: 18 };
  const client = { x: left.x + Math.round(left.w / 2) - 14, y: left.base + 24 };

  // the cinema: a screen on two posts at the top of the park
  const cw = 64, ch = 26;
  const cinema = { x: Math.round(L.park.x + L.park.w / 2 - cw / 2), y: L.park.y - 4, w: cw, h: ch };

  L.solids.push(
    { x: letterBox.x, y: letterBox.y - 3, w: 9, h: 3 },
    { x: filesBox.x, y: filesBox.y - 3, w: 9, h: 3 },
    { x: menu.x, y: menu.y - 3, w: 10, h: 3 },
    { x: cinema.x + 2, y: cinema.y + ch + 6, w: 4, h: 3 },
    { x: cinema.x + cw - 6, y: cinema.y + ch + 6, w: 4, h: 3 },
  );

  const person = (id: SpotId, p: Pt, text: string): Spot => ({ id, x: p.x, y: p.y, hit: { x: p.x - 8, y: p.y - 27, w: 16, h: 28 }, text });
  const thing = (id: SpotId, p: Pt, w: number, h: number, text: string): Spot => ({ id, x: p.x + w / 2, y: p.y, hit: { x: p.x - 2, y: p.y - h - 2, w: w + 4, h: h + 4 }, text });
  const spots: Spot[] = [
    person("barista", barista, "talk to the barista"),
    person("client", client, "talk to the client"),
    thing("menu", menu, 10, 13, "read the menu"),
    thing("hydrant", { x: hydrant.x, y: hydrant.y }, 10, 10, "look at the hydrant"),
    thing("files", filesBox, 9, 13, "open the mailbox"),
    thing("letter", letterBox, 9, 13, "write kaja a letter"),
  ];
  cached = { kerning, cafe, nudged, graffiti, hydrant: { x: hydrant.x, y: hydrant.y }, letterBox, filesBox, menu, billboard, barista, client, cinema, spots };
  return cached;
}

// The slides, as the cinema shows them: [heading, ...lines]
const SLIDES: string[][] = [
  ["design show & tell", EVENT.edition, EVENT.dateLabel],
  ["your hosts", ...HOSTS.map((h) => h.name)],
  ["thanks to", SPONSOR.name],
  ["tonight", ...SPEAKERS.map((s) => s.name)],
  ["the village", "scan the code", "make your villager"],
];
const SLIDE_SEC = 3.2;
const CURSOR_COLORS = ["#f24822", "#ffa629", "#14ae5c", "#0d99ff", "#9747ff", "#ff24bd", "#00b5ce"];

export class Eggs {
  L = eggLayout();
  kern = 0;
  kernDone = false;
  swatch = 0;
  logo = 1;
  grid = false;
  figma = false;
  /** how visible the graffiti is right now (the world hides your label over it) */
  graffitiAlpha = 0;
  private typed = "";
  private cursors = new Map<string, Pt>();

  /** Feed every typed letter. Returns which toggle fired, if any. */
  key(ch: string): "grid" | "figma" | null {
    this.typed = (this.typed + ch).slice(-8);
    if (this.typed.endsWith("figma")) {
      this.figma = !this.figma;
      this.typed = "";
      return "figma";
    }
    // the g in "figma" shouldn't flip the grid
    if (ch === "g" && !this.typed.endsWith("fig")) {
      this.grid = !this.grid;
      return "grid";
    }
    return null;
  }

  spotAt(w: Pt) {
    return this.L.spots.find((s) => w.x >= s.hit.x && w.x <= s.hit.x + s.hit.w && w.y >= s.hit.y && w.y <= s.hit.y + s.hit.h) ?? null;
  }

  /** Returns true the moment the sign becomes perfectly kerned. */
  update(dt: number, you: Pt) {
    const k = this.L.kerning;
    const before = k.x - 6 <= you.x && you.x <= k.x + k.w + 6 && you.y > k.base && you.y < k.base + 44;
    this.kern = clamp(this.kern + (before ? dt / 4 : -dt / 12));
    const done = this.kern >= 1 && !this.kernDone;
    if (done) this.kernDone = true;
    if (this.kern < 0.6) this.kernDone = false;
    return done;
  }

  // Facades and roofs: drawn over the static layer, behind everyone.
  drawBehind(g: G, p: Palette, t: number, you: Pt, zoomed: boolean) {
    this.kerningSign(g, p);
    this.cafeSign(g, p);
    this.billboard(g, p);
    this.hydrant(g);
    this.graffitiAlpha = 0;
    if (!zoomed) this.graffiti(g, you);
  }

  private kerningSign(g: G, p: Palette) {
    const b = this.L.kerning;
    const sb = b.base - 24;
    const x = b.x + 3, w = b.w - 6, y = sb - 1, h = 8;
    R(g, x - 1, y - 1, w + 2, h + 2, p.ink);
    R(g, x, y, w, h, "#fffaf0");
    g.font = "700 6px ui-monospace, Menlo, monospace";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#021093";
    const word = "KERNING";
    const widths = [...word].map((c) => g.measureText(c).width);
    const track = 1;
    const total = widths.reduce((a, c) => a + c, 0) + track * (word.length - 1);
    // awful: clumps and gaps, bouncing off the baseline
    const BAD = [0, 0.13, 0.2, 0.47, 0.64, 0.7, 0.93], DY = [0, 1, -1, 0, 1, 0, -1];
    const e = ease(this.kern);
    let gx = x + (w - total) / 2;
    [...word].forEach((c, i) => {
      const bad = x + 2 + BAD[i] * (w - 4 - widths[i]);
      g.fillText(c, bad + (gx - bad) * e, y + 6.5 + DY[i] * (1 - e));
      gx += widths[i] + track;
    });
  }

  private cafeSign(g: G, p: Palette) {
    const b = this.L.cafe;
    if (b === this.L.kerning) return;
    const sb = b.base - 24;
    const x = b.x + 3, w = b.w - 6, y = sb - 1, h = 8;
    R(g, x - 1, y - 1, w + 2, h + 2, "#6b4a34");
    R(g, x, y, w, h, "#2f4a3a");
    g.font = "600 5px ui-monospace, Menlo, monospace";
    g.textBaseline = "alphabetic";
    g.textAlign = "center";
    g.fillStyle = "#f6efe0";
    g.fillText("lorem ipsum café", x + w / 2, y + 6, w - 2);
    g.textAlign = "start";
    void p;
  }

  private billboard(g: G, p: Palette) {
    const { x, y, w, h } = this.L.billboard;
    // legs and a catwalk down to the roof
    R(g, x + 5, y + h, 1, 6, p.ink);
    R(g, x + w - 6, y + h, 1, 6, p.ink);
    R(g, x + 2, y + h + 2, w - 4, 1, p.ink);
    R(g, x - 1, y - 1, w + 2, h + 2, p.ink);
    R(g, x, y, w, h, "#ffffff");
    // the logo: a dot and a wordmark, a bit bigger every time the client asks
    const s = this.logo;
    const cx = x + w / 2, cy = y + h / 2;
    g.font = `800 ${5 * s}px ui-sans-serif, system-ui, sans-serif`;
    g.textBaseline = "middle";
    const word = "brand", tw = g.measureText(word).width, r = 2.6 * s, gap = 1.5 * s;
    const left = cx - (r * 2 + gap + tw) / 2;
    g.fillStyle = "#ff5a4e";
    g.beginPath();
    g.arc(left + r, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#021093";
    g.fillText(word, left + r * 2 + gap, cy + 0.3 * s);
    g.textBaseline = "alphabetic";
  }

  private hydrant(g: G) {
    const { x, y } = this.L.hydrant;
    const c = SWATCHES[this.swatch][1], d = darken(c, 0.75);
    R(g, x, y - 6, 4, 6, c);
    R(g, x - 1, y - 4, 6, 1, d);
    R(g, x, y - 7, 4, 1, d);
    // the swatch card tied to it
    R(g, x + 5, y - 11, 5, 8, "#ffffff");
    R(g, x + 5, y - 11, 5, 4, c);
    R(g, x + 6, y - 6, 3, 1, "#9aa3b5");
    R(g, x + 6, y - 5, 2, 1, "#9aa3b5");
    R(g, x + 4, y - 9, 1, 1, "#9aa3b5");
  }

  private graffiti(g: G, you: Pt) {
    const b = this.L.graffiti;
    const gx = b.x + 5, gy = b.base - 12;
    const d = Math.hypot(you.x - (b.x + b.w / 2), you.y - (b.base + 14));
    const a = clamp(1 - (d - 34) / 26);
    this.graffitiAlpha = a;
    if (a <= 0) return;
    g.save();
    g.globalAlpha = a;
    g.translate(gx, gy);
    g.rotate(-0.12);
    g.font = `700 7px "Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive`;
    g.textBaseline = "alphabetic";
    g.lineJoin = "round";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.6;
    g.strokeText("comic sans <3", 0, 0, b.w - 8);
    g.fillStyle = "#ff3d9a";
    g.fillText("comic sans <3", 0, 0, b.w - 8);
    g.restore();
  }

  // Things people can stand in front of or behind: [ground y, draw]
  depthItems(g: G, p: Palette, t: number): { y: number; draw: () => void }[] {
    return [
      { y: this.L.letterBox.y, draw: () => this.mailbox(g, p, this.L.letterBox, "#ffcc00", "#d9a400", true) },
      { y: this.L.filesBox.y, draw: () => this.mailbox(g, p, this.L.filesBox, "#2c5be0", "#1d3fae", false) },
      { y: this.L.menu.y, draw: () => this.menuBoard(g) },
      { y: this.L.cinema.y + this.L.cinema.h + 8, draw: () => this.cinema(g, p, t) },
    ];
  }

  private mailbox(g: G, p: Palette, at: Pt, c: string, d: string, letters: boolean) {
    const { x, y } = at;
    R(g, x + 1, y - 1, 8, 1, p.shadow);
    R(g, x + 2, y - 3, 1, 3, p.ink);
    R(g, x + 6, y - 3, 1, 3, p.ink);
    R(g, x + 1, y - 13, 7, 1, c);
    R(g, x, y - 12, 9, 9, c);
    R(g, x, y - 4, 9, 1, d);
    R(g, x + 2, y - 10, 5, 1, p.ink);
    if (letters) {
      // a post horn, and a letter half in the slot
      R(g, x + 3, y - 7, 3, 2, "#0b1a5e");
      R(g, x + 2, y - 7, 1, 1, "#0b1a5e");
      R(g, x + 3, y - 12, 3, 2, "#ffffff");
    } else {
      // a sticker: "v3"
      R(g, x + 2, y - 8, 5, 3, "#ffffff");
      R(g, x + 3, y - 7, 1, 1, "#d9453b");
      R(g, x + 5, y - 7, 1, 1, "#d9453b");
    }
  }

  private menuBoard(g: G) {
    const { x, y } = this.L.menu;
    R(g, x + 1, y - 2, 1, 2, "#6b4a34");
    R(g, x + 8, y - 2, 1, 2, "#6b4a34");
    R(g, x, y - 13, 10, 11, "#6b4a34");
    R(g, x + 1, y - 12, 8, 9, "#2b3a33");
    g.fillStyle = "#e8efe9";
    for (let i = 0; i < 4; i++) g.fillRect(x + 2, y - 11 + i * 2, i % 2 ? 4 : 6, 1);
  }

  private cinema(g: G, p: Palette, t: number) {
    const { x, y, w, h } = this.L.cinema;
    R(g, x + 3, y + h, 2, 8, p.ink);
    R(g, x + w - 5, y + h, 2, 8, p.ink);
    if (p.night) {
      g.fillStyle = "rgba(220,232,255,0.08)";
      g.fillRect(x - 6, y - 4, w + 12, h + 8);
    }
    R(g, x - 2, y - 2, w + 4, h + 4, p.ink);
    R(g, x, y, w, h, "#f4f4f4");
    const n = Math.abs(Math.floor(t / SLIDE_SEC)) % SLIDES.length, local = Math.abs(t) % SLIDE_SEC;
    const [head, ...lines] = SLIDES[n] ?? SLIDES[0];
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#021093";
    const total = 6 + lines.length * 5;
    let ty = y + Math.round((h - total) / 2) + 5;
    g.font = "700 5px ui-monospace, Menlo, monospace";
    g.fillText(head, x + w / 2, ty, w - 4);
    g.font = "400 4px ui-monospace, Menlo, monospace";
    for (const l of lines) {
      ty += 5;
      g.fillText(l, x + w / 2, ty + 1, w - 6);
    }
    g.textAlign = "start";
    // a projector's flicker between slides, and faint scanlines
    if (local < 0.14) {
      g.fillStyle = `rgba(255,255,255,${0.85 * (1 - local / 0.14)})`;
      g.fillRect(x, y, w, h);
    }
    g.fillStyle = "rgba(2,16,147,0.05)";
    for (let sy = y + 1; sy < y + h; sy += 2) g.fillRect(x, sy, w, 1);
    // marquee under the screen
    R(g, x + 14, y + h + 2, w - 28, 4, p.ink);
    for (let i = 0; i < w - 30; i += 3) R(g, x + 15 + i, y + h + 3, 1, 1, (Math.floor(t * 4) + i / 3) % 2 < 1 ? "#f2c14e" : "#7a6124");
  }

  /** Multiplayer cursors, trailing a little behind everyone. */
  drawCursors(g: G, people: { key: string; name: string; x: number; y: number }[], dt: number) {
    const k = 1 - Math.exp(-dt * 4);
    const live = new Set<string>();
    g.textBaseline = "alphabetic";
    g.font = "600 4px ui-sans-serif, system-ui, sans-serif";
    for (const person of people) {
      live.add(person.key);
      const target = { x: person.x + 7, y: person.y - 20 };
      const c = this.cursors.get(person.key) ?? { ...target };
      c.x += (target.x - c.x) * k;
      c.y += (target.y - c.y) * k;
      this.cursors.set(person.key, c);
      let h = 0;
      for (const ch of person.key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const color = CURSOR_COLORS[h % CURSOR_COLORS.length];
      const cx = Math.round(c.x), cy = Math.round(c.y);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx, cy + 8);
      g.lineTo(cx + 2.2, cy + 6.2);
      g.lineTo(cx + 5.6, cy + 6.2);
      g.closePath();
      g.lineWidth = 0.8;
      g.strokeStyle = "#ffffff";
      g.stroke();
      g.fillStyle = color;
      g.fill();
      const tw = Math.ceil(g.measureText(person.name).width);
      R(g, cx + 4, cy + 7, tw + 4, 6, color);
      g.fillStyle = "#ffffff";
      g.fillText(person.name, cx + 6, cy + 11.5);
    }
    for (const key of this.cursors.keys()) if (!live.has(key)) this.cursors.delete(key);
  }

  /** The 8px layout grid, in screen space; the building that's a pixel off blinks red. */
  drawGrid(g: G, Z: number, ox: number, oy: number, W: number, H: number, t: number) {
    if (!this.grid) return;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const step = 8 * Z;
    g.fillStyle = "rgba(255, 45, 85, 0.32)";
    for (let x = ((ox % step) + step) % step; x < W; x += step) g.fillRect(Math.round(x), 0, 1, H);
    for (let y = ((oy % step) + step) % step; y < H; y += step) g.fillRect(0, Math.round(y), W, 1);
    const b = this.L.nudged;
    if (Math.floor(t * 2.5) % 2 === 0) {
      const sx = ox + b.x * Z, sy = oy + (b.rear + 1) * Z, sw = b.w * Z, sh = (b.base - b.rear + 1) * Z;
      g.strokeStyle = "#ff2d55";
      g.lineWidth = Math.max(2, Z / 2);
      g.strokeRect(Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh));
      const fs = Math.round(4 * Z);
      g.font = `600 ${fs}px ui-monospace, Menlo, monospace`;
      g.textBaseline = "top";
      const label = "1px off";
      const lw = g.measureText(label).width + fs;
      g.fillStyle = "#ff2d55";
      g.fillRect(Math.round(sx), Math.round(sy - fs * 1.6), Math.round(lw), Math.round(fs * 1.6));
      g.fillStyle = "#ffffff";
      g.fillText(label, Math.round(sx + fs / 2), Math.round(sy - fs * 1.3));
    }
    g.restore();
  }
}
