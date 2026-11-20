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
// - an open-air cinema at the top of the park looping photos from the last event
// - the font foundry: its sign cycles typefaces; the license is per seat
// - the icon shop: a hamburger sign; tap it and the shutters open like a nav drawer
// - the rounded corner barber: every visit takes a little more off the corners
// - the stock photo studio: woman laughing alone with salad, watermarked
// - john doe, the placeholder resident, waving from his window
// - an accessibility ramp that reports the house's real contrast ratio
// - the design system flats: every window is a button in a different state
// - the hierarchy tower: h1 at the bottom, captions at the top (just to look at)
// - lost & found by the ferry building (the ui lists what's in it)
// - typography and spacing street names on the corner signs
// ---------------------------------------------------------------------------
import { BX, BY, COLS, ROWS, ST, blockX, blockY, layout, type Building, type Palette, type Rect } from "./map";
import { VISITOR, type Config } from "./villager";

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

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export type SpotId =
  | "barista" | "client" | "menu" | "hydrant" | "files" | "letter"
  | "foundry" | "icon" | "barber" | "stock" | "john" | "ramp" | "system" | "lost";
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
export const CLIENT_SMALLER = "actually… can it be smaller?";
export const LOGO_MAX = 3;
export const LINES = {
  foundry: "license: 1 desktop seat · 480 €. webfonts are extra.",
  icon: "home · about · work · contact",
  stock: "woman laughing alone with salad. that'll be 299 € for web use.",
  john: "hi, i'm john doe. i live in every mockup.",
  system: "button: default · hover · pressed · focus · disabled · loading",
};
// radius (world px on the 8px-tall sign: 4 is a pill) and what the barber says
export const BARBER: [number, string][] = [
  [1, "just a little off the 4px?"],
  [2, "8px. very friendly."],
  [3, "16px. apple called."],
  [4, "999px. it's a pill now."],
  [0, "back to sharp corners. brutalism is in."],
];
const FONTS = [
  '700 6px Georgia, "Times New Roman", serif',
  'italic 600 6px Georgia, "Times New Roman", serif',
  "800 6px ui-sans-serif, system-ui, sans-serif",
  "700 6px ui-monospace, Menlo, monospace",
  '400 7px "Snell Roundhand", "Brush Script MT", cursive',
  '900 6px Impact, "Arial Black", sans-serif',
];
// corner signs: horizontal streets top to bottom, avenues left to right (each
// block's sign names the street and avenue at its bottom-right corner, so the
// first of each list only names the edges, which have no sign)
const STREETS = ["grid st", "baseline st", "gutter st", "margin st"];
const AVENUES = ["x-height ave", "kerning ave", "leading ave", "tracking ave"];

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
  foundry?: Building;
  icon?: Building;
  barber?: Building;
  stock?: Building;
  john: Building;
  ramp: Building;
  system: Building;
  tower: { x: number; rear: number; base: number } | null;
  lost: Pt;
  corners: { x: number; y: number; street: string; avenue: string }[];
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

  // the next four shops, and three homes in different blocks
  const [foundry, icon, barber, stock] = shops.slice(2, 6);
  const taken = new Set<Building>([nudged, graffiti, left]);
  const pick = (kind: Building["kind"], i: number, j: number) => {
    const b = L.buildings.find((x) => x.kind === kind && !taken.has(x) && blockOf(x).i === i && blockOf(x).j === j) ?? homes.find((x) => x.kind === kind && !taken.has(x))!;
    taken.add(b);
    return b;
  };
  const john = pick("victorian", start.i, start.j);
  const ramp = pick("victorian", 1, 2);
  const system = pick("flat", 0, 2);
  const tower = L.towers[0] ?? null;
  const d = L.diner;
  const lost = { x: d.x + 16, y: d.y + d.h + 18 };
  const corners: EggLayout["corners"] = [];
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) corners.push({ x: blockX(i) + BX + 1, y: blockY(j) + BY - 2, street: STREETS[j + 1], avenue: AVENUES[i + 1] });

  L.solids.push(
    { x: letterBox.x, y: letterBox.y - 3, w: 9, h: 3 },
    { x: filesBox.x, y: filesBox.y - 3, w: 9, h: 3 },
    { x: menu.x, y: menu.y - 3, w: 10, h: 3 },
    { x: cinema.x + 2, y: cinema.y + ch + 6, w: 4, h: 3 },
    { x: cinema.x + cw - 6, y: cinema.y + ch + 6, w: 4, h: 3 },
    { x: lost.x, y: lost.y - 3, w: 14, h: 3 },
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
    thing("john", { x: john.door - 1, y: john.base }, 11, 20, "knock on the door"),
    thing("ramp", { x: ramp.door - 19, y: ramp.base + 10 }, 16, 12, "check the contrast"),
    thing("lost", lost, 14, 18, "check lost & found"),
  ];
  // shops: the whole shopfront; the flats: their facade, used from the sidewalk
  const front = (id: SpotId, b: Building | undefined, text: string) => b && spots.push({ id, x: b.x + b.w / 2, y: b.base, hit: { x: b.x, y: b.top, w: b.w, h: b.base - b.top + 2 }, text });
  front("foundry", foundry, "look in the foundry");
  front("icon", icon, "tap the menu");
  front("barber", barber, "step into the barber");
  front("stock", stock, "look at the window");
  front("system", system, "look at the windows");
  cached = {
    kerning, cafe, nudged, graffiti, hydrant: { x: hydrant.x, y: hydrant.y }, letterBox, filesBox, menu, billboard, barista, client, cinema,
    foundry, icon, barber, stock, john, ramp, system, tower, lost, corners, spots,
  };
  return cached;
}

// What the cinema shows: text slides ([heading, ...lines]) and photos from the
// last show & tell (public/village/last-event-*.png, 128x52: twice the
// screen's resolution, drawn without smoothing so they read as pixel art)
type Slide = string[] | { photo: number };
const SLIDES: Slide[] = [
  ["last show & tell", "19 nov 2026", "visionect"],
  { photo: 0 },
  { photo: 1 },
  { photo: 2 },
  ["next one", "early 2027", "exact date soon"],
  ["the village", "move in", "make your villager"],
];
const PHOTOS: HTMLImageElement[] =
  typeof window === "undefined"
    ? []
    : [1, 2, 3].map((i) => {
        const img = new Image();
        img.src = `/village/last-event-${i}.png`;
        return img;
      });
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
  /** the billboard's logo as drawn, easing to `logo` */
  logoShown = 1;
  /** icon shop shutters: 1 shut, 0 open (eases to shutterTo) */
  shutter = 1;
  shutterTo = 1;
  barberStep = -1;
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
    const ease = 1 - Math.exp(-dt * 6);
    this.logoShown += (this.logo - this.logoShown) * ease;
    this.shutter += (this.shutterTo - this.shutter) * ease;
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
    this.foundrySign(g, p, t);
    this.iconShop(g, p);
    this.barberShop(g, p, t);
    this.stockStudio(g, p, t);
    this.johnDoe(g, t);
    this.ramp(g, p);
    this.designSystem(g, t);
    this.hierarchy(g, p);
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
    const s = this.logoShown;
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
      { y: this.L.lost.y, draw: () => this.lostBooth(g, p) },
      ...this.L.corners.map((c) => ({ y: c.y, draw: () => this.cornerSign(g, p, c) })),
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
    const slide = SLIDES[n] ?? SLIDES[0];
    const img = Array.isArray(slide) ? null : PHOTOS[slide.photo];
    if (img?.complete && img.naturalWidth) {
      const smooth = g.imageSmoothingEnabled;
      g.imageSmoothingEnabled = false;
      g.drawImage(img, x, y, w, h);
      g.imageSmoothingEnabled = smooth;
    }
    const [head, ...lines] = Array.isArray(slide) ? slide : [];
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#021093";
    const total = 6 + lines.length * 5;
    let ty = y + Math.round((h - total) / 2) + 5;
    g.font = "700 5px ui-monospace, Menlo, monospace";
    if (head) g.fillText(head, x + w / 2, ty, w - 4);
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

  /** The contrast between a house's walls and its door, as wcag would grade it. */
  contrastLine(p: Palette) {
    const b = this.L.ramp;
    const wall = b.wall === "A" ? p.wallA : b.wall === "B" ? p.wallB : p.wallC;
    const r = contrast(wall, p.ink);
    const grade = r >= 7 ? "aaa ✓" : r >= 4.5 ? "aa ✓" : r >= 3 ? "aa for large text only" : "fails aa. we're on it.";
    return `contrast ${r.toFixed(1)}:1 · ${grade}`;
  }

  // a shop sign over the awning, like the kerning one
  private sign(g: G, b: Building, bg: string, edge: string, radius = 0) {
    const sb = b.base - 24;
    const x = b.x + 3, w = b.w - 6, y = sb - 1, h = 8;
    if (radius) {
      g.fillStyle = edge;
      g.beginPath();
      g.roundRect(x - 1, y - 1, w + 2, h + 2, radius + 1);
      g.fill();
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(x, y, w, h, radius);
      g.fill();
    } else {
      R(g, x - 1, y - 1, w + 2, h + 2, edge);
      R(g, x, y, w, h, bg);
    }
    return { x, y, w, h, sb };
  }

  private foundrySign(g: G, p: Palette, t: number) {
    const b = this.L.foundry;
    if (!b) return;
    const s = this.sign(g, b, "#fffaf0", p.ink);
    g.font = FONTS[Math.floor(t / 1.4) % FONTS.length];
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#021093";
    g.fillText("foundry", s.x + s.w / 2, s.y + s.h / 2 + 0.5, s.w - 4);
    g.textAlign = "start";
    g.textBaseline = "alphabetic";
  }

  private iconShop(g: G, p: Palette) {
    const b = this.L.icon;
    if (!b) return;
    const s = this.sign(g, b, "#ffffff", p.ink);
    // the hamburger
    const ix = Math.round(s.x + s.w / 2 - 4);
    for (let i = 0; i < 3; i++) R(g, ix, s.y + 2 + i * 2, 8, 1, "#021093");
    // roller shutters over the shopfront, rolling up into the sign
    const top = s.sb + 9, full = 15, h = Math.round(full * this.shutter);
    if (h > 0) {
      R(g, b.x + 3, top, b.w - 6, h, "#c3cad8");
      for (let yy = top + 1; yy < top + h; yy += 2) R(g, b.x + 3, yy, b.w - 6, 1, "#9aa3b5");
      R(g, b.x + 3, top + h - 1, b.w - 6, 1, "#6b7591");
    }
  }

  private barberShop(g: G, p: Palette, t: number) {
    const b = this.L.barber;
    if (!b) return;
    const r = this.barberStep < 0 ? 0 : BARBER[this.barberStep][0];
    const s = this.sign(g, b, "#ffffff", p.ink, r);
    g.font = "600 4px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#021093";
    g.fillText("border-radius", s.x + s.w / 2, s.y + s.h / 2 + 0.5, s.w - 4);
    g.textAlign = "start";
    g.textBaseline = "alphabetic";
    // the pole, stripes turning
    const px = b.x + b.w - 7, py = s.sb + 9, ph = 14;
    R(g, px - 1, py - 1, 5, 1, p.ink);
    R(g, px - 1, py + ph, 5, 1, p.ink);
    const shift = Math.floor(t * 6);
    for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < 3; xx++) {
      const band = (((yy + xx + shift) % 6) + 6) % 6;
      R(g, px + xx, py + yy, 1, 1, band < 2 ? "#d9453b" : band < 4 ? "#ffffff" : "#3b5bdb");
    }
  }

  private stockStudio(g: G, p: Palette, t: number) {
    const b = this.L.stock;
    if (!b) return;
    const s = this.sign(g, b, "#ffffff", p.ink);
    g.font = "600 5px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#021093";
    g.fillText("stock photos", s.x + s.w / 2, s.y + s.h / 2 + 0.5, s.w - 4);
    g.textAlign = "start";
    // the big window: a woman laughing alone with salad
    const wx = b.x + 34, wy = s.sb + 10, ww = b.w - 38, wh = 13;
    R(g, wx, wy, ww, wh, "#fff1dc");
    const laugh = Math.floor(t * 3) % 2;
    R(g, wx + 2, wy + 7, 6, 6, "#f2a7c3");
    R(g, wx + 3, wy + 1 - laugh, 5, 3, "#6b4226");
    R(g, wx + 3, wy + 3 - laugh, 4, 4, "#f0c8a8");
    R(g, wx + 2, wy + 3 - laugh, 1, 4, "#6b4226");
    R(g, wx + 5, wy + 5 - laugh, 2, 1, "#b5524a");
    R(g, wx + 9, wy + 9, Math.min(7, ww - 10), 2, "#ffffff");
    R(g, wx + 10, wy + 8, Math.min(5, ww - 11), 1, "#3f9b6e");
    R(g, wx + 11, wy + 7, 1, 1, "#7cc36b");
    R(g, wx + 13, wy + 7, 1, 1, "#d9453b");
    R(g, wx + 7, wy + 8, 3, 1, "#f0c8a8");
    // the watermark, across both windows
    g.save();
    g.translate(b.x + 16 + (b.w - 20) / 2, wy + 7);
    g.rotate(-0.25);
    g.font = "700 5px ui-sans-serif, system-ui, sans-serif";
    g.textAlign = "center";
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.fillText("© stock", 0, 0);
    g.restore();
    g.textBaseline = "alphabetic";
  }

  private johnDoe(g: G, t: number) {
    const b = this.L.john;
    const cols = Math.max(1, Math.floor((b.w - 4) / 12));
    const win = b.windows[Math.max(0, b.windows.length - cols)];
    if (!win) return;
    const x = win.x + 1, y = win.y + 1;
    // a placeholder avatar, waving
    R(g, x, y, 5, 8, "#e3e6ec");
    R(g, x + 1, y + 1, 3, 3, "#9aa3b5");
    R(g, x, y + 5, 5, 3, "#9aa3b5");
    const up = Math.floor(t * 3) % 2;
    R(g, x + 4, y + 2 + up, 1, 3 - up, "#9aa3b5");
  }

  private ramp(g: G, p: Palette) {
    const b = this.L.ramp;
    const x = b.door - 19, y = b.base + 1;
    // the ramp slopes up to the top of the stoop
    for (let i = 0; i < 16; i++) {
      const hgt = Math.round((i / 15) * 8) + 2;
      R(g, x + i, y + 10 - hgt, 1, hgt, i % 4 === 0 ? p.stepDark : p.step);
    }
    R(g, x, y + 10, 16, 1, p.stepDark);
    // handrail
    for (let i = 0; i < 16; i += 1) R(g, x + i, y + 6 - Math.round((i / 15) * 8), 1, 1, p.ink);
    R(g, x, y + 6, 1, 4, p.ink);
    // the access sign by the door
    const sx = b.door - 10, sy = b.base - 16;
    R(g, sx, sy, 6, 6, "#1f5fd1");
    R(g, sx + 2, sy + 1, 1, 1, "#ffffff");
    R(g, sx + 2, sy + 2, 1, 2, "#ffffff");
    R(g, sx + 2, sy + 4, 3, 1, "#ffffff");
    R(g, sx + 1, sy + 3, 1, 2, "#ffffff");
  }

  private designSystem(g: G, t: number) {
    const b = this.L.system;
    const spin = Math.floor(t * 5) % 3;
    b.windows.forEach((win, i) => {
      const x = win.x + 1, y = win.y + 1;
      R(g, x, y, 5, 8, "#f4f6fb");
      switch (i % 6) {
        case 0: R(g, x, y + 3, 5, 3, "#021093"); break; // default
        case 1: R(g, x, y + 3, 5, 3, "#3b5bdb"); break; // hover
        case 2: R(g, x, y + 4, 5, 3, "#010a5e"); break; // pressed: a pixel down, darker
        case 3: R(g, x, y + 2, 5, 5, "#f2c14e"); R(g, x + 1, y + 3, 3, 3, "#021093"); break; // focus ring
        case 4: R(g, x, y + 3, 5, 3, "#c3cad8"); break; // disabled
        case 5: R(g, x, y + 3, 5, 3, "#021093"); R(g, x + 1 + spin, y + 4, 1, 1, "#ffffff"); break; // loading
      }
    });
  }

  private hierarchy(g: G, p: Palette) {
    const tw = this.L.tower;
    if (!tw) return;
    const cx = tw.x + 15;
    const levels: [string, number, number][] = [["h1", 6, 14], ["h2", 5, 27], ["h3", 4, 38], ["body", 3, 48], ["caption", 2, 56]];
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    for (const [label, size, up] of levels) {
      g.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
      const w = g.measureText(label).width;
      const y = tw.base - up;
      R(g, cx - w / 2 - 1, y - size, Math.ceil(w) + 2, size + 1, p.trim);
      g.fillStyle = p.ink;
      g.fillText(label, cx, y);
    }
    g.textAlign = "start";
  }

  private lostBooth(g: G, p: Palette) {
    const { x, y } = this.L.lost;
    R(g, x + 1, y - 1, 13, 1, p.shadow);
    R(g, x + 1, y - 10, 1, 10, p.ink);
    R(g, x + 12, y - 10, 1, 10, p.ink);
    R(g, x, y - 7, 14, 6, "#e8dcc0");
    R(g, x, y - 7, 14, 1, "#8a5a3b");
    // a box and an umbrella someone left
    R(g, x + 2, y - 10, 4, 3, "#c28a4a");
    R(g, x + 8, y - 11, 1, 4, p.ink);
    R(g, x + 7, y - 12, 3, 1, "#d9453b");
    // the striped awning and its sign
    for (let i = 0; i < 14; i += 2) R(g, x + i, y - 14, 2, 3, i % 4 ? "#ffffff" : "#3b5bdb");
    R(g, x - 3, y - 20, 20, 6, "#ffffff");
    R(g, x - 3, y - 20, 20, 1, p.ink);
    R(g, x - 3, y - 15, 20, 1, p.ink);
    g.font = "600 4px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.fillStyle = "#021093";
    g.fillText("lost+found", x + 7, y - 16, 18);
    g.textAlign = "start";
  }

  // san francisco's green street-name blades, two to a post
  private cornerSign(g: G, p: Palette, c: { x: number; y: number; street: string; avenue: string }) {
    const { x, y } = c;
    R(g, x, y - 32, 1, 32, p.ink);
    g.font = "600 4px ui-monospace, Menlo, monospace";
    g.textBaseline = "alphabetic";
    [c.street, c.avenue].forEach((name, i) => {
      const w = Math.ceil(g.measureText(name).width) + 4, by = y - 32 + i * 6;
      R(g, x - w, by, w, 5, "#2f6b4f");
      R(g, x - w, by + 4, w, 1, "#1f4d38");
      g.fillStyle = "#ffffff";
      g.fillText(name, x - w + 2, by + 4);
    });
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
