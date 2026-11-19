// ---------------------------------------------------------------------------
// The village as a little san francisco grid: 3x3 blocks with streets
// between them, seen from above at an angle (buildings show their fronts):
// rows of painted-lady victorians and edwardian flats with bay windows, corner
// cafés under scalloped awnings, a transamerica-style pyramid, the ferry
// building's clock tower, and a park (the christmas tree) with a muni/bart
// entrance. Built once from a fixed seed. The city is
// drawn in the site's blues; people, cable cars and a few signs carry the
// colour. Everything here is in world pixels (1 = one pixel
// of a 12x20 villager); the world scales it up by a whole number.
//
// - layout(): blocks, buildings (each home to 3 villagers), solids, props
// - drawStatic(): ground, streets, buildings → an offscreen canvas (redrawn
//   when the theme or the number of residents changes)
// - drawTall(): props people can walk behind (trees, lamps, the sign),
//   drawn in the same depth-sorted pass as the villagers
// ---------------------------------------------------------------------------
import { mulberry } from "./villager";

export type Palette = {
  night: boolean;
  asphalt: string; asphaltLine: string; lane: string; sidewalk: string; paving: string; curb: string; curbHi: string;
  grass: string; grassDark: string; dirt: string; dirtDark: string;
  wallA: string; wallADark: string; wallB: string; wallBDark: string; wallC: string; wallCDark: string;
  trim: string; trimDark: string; ink: string; glass: string; lit: string; roof: string; roofDark: string;
  white: string; step: string; stepDark: string; leaf: string; leafDark: string; bulb: string; shadow: string;
};
export const PALETTES: Record<"day" | "night", Palette> = {
  day: {
    night: false,
    asphalt: "#cfd8ef", asphaltLine: "#c1cbe8", lane: "#3b5bdb", sidewalk: "#f1f4fc", paving: "#e3e9f7", curb: "#a9b8e2", curbHi: "#ffffff",
    grass: "#c3d3f7", grassDark: "#9fb6ee", dirt: "#e6ecfa", dirtDark: "#d3dcf3",
    wallA: "#3b5bdb", wallADark: "#3350c4", wallB: "#9db8f3", wallBDark: "#88a6ec", wallC: "#5f7fe3", wallCDark: "#506fd4",
    trim: "#eef3fe", trimDark: "#b9c7ef", ink: "#021093", glass: "#93c5fd", lit: "#ffffff", roof: "#7d90cb", roofDark: "#6a7dbb",
    white: "#ffffff", step: "#cbd6f3", stepDark: "#a6b6e4", leaf: "#3b5bdb", leafDark: "#021093", bulb: "#f2c14e", shadow: "rgba(2,16,147,0.14)",
  },
  night: {
    night: true,
    asphalt: "#0d1a45", asphaltLine: "#122152", lane: "#93c5fd", sidewalk: "#16275e", paving: "#1b2e69", curb: "#08112f", curbHi: "#2c4287",
    grass: "#132a66", grassDark: "#0e2156", dirt: "#1a2d68", dirtDark: "#15255a",
    wallA: "#1e3a8a", wallADark: "#19327a", wallB: "#2f4ca5", wallBDark: "#28428f", wallC: "#243f95", wallCDark: "#1e3681",
    trim: "#4561b8", trimDark: "#2e4796", ink: "#040c2a", glass: "#0b1640", lit: "#f6d27a", roof: "#0f1e50", roofDark: "#0a163e",
    white: "#dbe7ff", step: "#25407f", stepDark: "#1b316a", leaf: "#2f4ca5", leafDark: "#0b1640", bulb: "#f6d27a", shadow: "rgba(0,0,0,0.35)",
  },
};

// ---- geometry ------------------------------------------------------------------
export const ST = 26; // street width
export const BX = 208; // block size
export const BY = 156;
export const COLS = 3;
export const ROWS = 3;
export const WORLD_W = COLS * BX + (COLS + 1) * ST;
export const WORLD_H = ROWS * BY + (ROWS + 1) * ST;
export const blockX = (i: number) => ST + i * (BX + ST);
export const blockY = (j: number) => ST + j * (BY + ST);
const PARK = { i: 1, j: 1 };
const DINER = { i: 2, j: 2 };

export type Rect = { x: number; y: number; w: number; h: number };
type Kind = "victorian" | "flat" | "shop" | "tower";
export type Building = {
  kind: Kind; x: number; w: number; rear: number; top: number; base: number;
  wall: "A" | "B" | "C"; door: number; home: { x: number; y: number }; windows: { x: number; y: number }[];
  nudge?: boolean; // drawn a pixel low: the 8px-grid easter egg (eggs.ts)
};
export type TallProp = { kind: "tree" | "pine" | "lamp" | "sign"; x: number; y: number };
export type SmallProp = { kind: "bench" | "planter" | "bin" | "hydrant" | "news" | "rack" | "flowers"; x: number; y: number; c?: string };
export type Layout = {
  buildings: Building[];
  solids: Rect[];
  tall: TallProp[];
  small: SmallProp[];
  park: Rect;
  parkTree: { x: number; y: number };
  subway: { x: number; y: number; spawn: { x: number; y: number } };
  diner: Rect;
  pigeons: { x: number; y: number }[];
  cabLanes: { y: number; dir: 1 | -1 }[];
  towers: { x: number; rear: number; base: number }[];
};

const WIDTH: Record<Kind, number> = { victorian: 46, flat: 52, shop: 56, tower: 30 };
const ROOF: Record<Kind, number> = { victorian: 14, flat: 4, shop: 10, tower: 0 };

let cached: Layout | null = null;
export function layout(): Layout {
  if (cached) return cached;
  const r = mulberry(1119);
  const buildings: Building[] = [];
  const solids: Rect[] = [];
  const tall: TallProp[] = [];
  const small: SmallProp[] = [];
  const towers: Layout["towers"] = [];

  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const x0 = blockX(i), y0 = blockY(j);
    if (i === PARK.i && j === PARK.j) continue;
    const rear = y0 + 8, base = y0 + 92;
    // a row of buildings along the top of the block, fronts facing the street below
    const isDiner = i === DINER.i && j === DINER.j;
    const order: Kind[] = isDiner ? ["victorian"] : i === 2 && j === 0 ? ["victorian", "flat", "shop", "tower"] : (["victorian", "flat", "victorian", "shop"] as Kind[]).sort(() => r() - 0.5);
    let x = isDiner ? x0 + BX - 4 - WIDTH.victorian : x0 + 4;
    // fit as many as the block takes, then share the leftover width out so the row is full
    const fitted: Kind[] = [];
    let used = 0;
    for (const kind of order) {
      if (used + WIDTH[kind] > BX - 8) break;
      fitted.push(kind);
      used += WIDTH[kind];
    }
    const spare = isDiner ? 0 : BX - 8 - used;
    const stretchable = fitted.filter((k) => k !== "tower").length;
    for (const [n, kind] of fitted.entries()) {
      const w = WIDTH[kind] + (kind === "tower" || !stretchable ? 0 : Math.floor(spare / stretchable) + (n === 0 ? spare % stretchable : 0));
      const top = rear + ROOF[kind];
      const wall = (["A", "B", "C"] as const)[Math.floor(r() * 3)];
      const doorLeft = kind === "shop";
      const door = doorLeft ? x + 4 : x + w - 14;
      const b: Building = { kind, x, w, rear, top, base, wall, door, home: { x: door + 4, y: base + 16 }, windows: [] };
      if (kind !== "tower") {
        const cols = Math.floor((w - 4) / 12);
        const pad = Math.floor((w - cols * 12) / 2) + 2;
        const floorsTop = kind === "shop" ? base - 24 : base - 22;
        for (let f = 0; top + 9 + f * 15 + 10 < floorsTop; f++) for (let c = 0; c < cols; c++) b.windows.push({ x: x + pad + c * 12, y: top + 9 + f * 15 });
        buildings.push(b);
      } else towers.push({ x, rear, base });
      solids.push({ x, y: rear, w, h: base - rear + 1 });
      if (kind !== "tower" && kind !== "shop") solids.push({ x: door - 3, y: base, w: 16, h: 11 }); // stoop
      x += w;
    }
    if (isDiner) {
      const d = { x: x0 + 14, y: y0 + 26, w: 124, h: 66 };
      solids.push(d);
      small.push({ kind: "planter", x: d.x - 2, y: d.y + d.h + 6 }, { kind: "planter", x: d.x + d.w - 14, y: d.y + d.h + 6 });
    }
    // street life on the sidewalk in front
    const py = base + 34;
    for (let k = 0; k < 3; k++) {
      const px = x0 + 20 + k * 64 + Math.floor(r() * 18);
      const pick = r();
      if (pick < 0.35) { tall.push({ kind: "pine", x: px + 6, y: py + 6 }); small.push({ kind: "planter", x: px, y: py }); solids.push({ x: px, y: py - 2, w: 14, h: 6 }); }
      else if (pick < 0.55) { small.push({ kind: "bench", x: px, y: py }); solids.push({ x: px, y: py, w: 18, h: 6 }); }
      else if (pick < 0.7) { small.push({ kind: "rack", x: px, y: py }); solids.push({ x: px, y: py + 2, w: 18, h: 4 }); }
      else if (pick < 0.85) { small.push({ kind: "news", x: px, y: py, c: "#d9453b" }, { kind: "news", x: px + 7, y: py, c: "#3b5bdb" }); solids.push({ x: px, y: py - 4, w: 13, h: 4 }); }
      else small.push({ kind: "flowers", x: px, y: py });
    }
    small.push({ kind: "hydrant", x: x0 + BX - 10, y: y0 + BY - 6 });
    tall.push({ kind: "lamp", x: x0 + 6, y: y0 + BY - 4 });
  }

  // the park: lawn, gravel, the christmas tree, benches, lamps, muni on the corner
  const px0 = blockX(PARK.i), py0 = blockY(PARK.j);
  const park = { x: px0 + 10, y: py0 + 10, w: BX - 20, h: BY - 20 };
  const parkTree = { x: px0 + BX / 2, y: py0 + BY / 2 + 8 };
  tall.push({ kind: "tree", x: parkTree.x, y: parkTree.y });
  solids.push({ x: parkTree.x - 10, y: parkTree.y - 4, w: 20, h: 6 });
  for (const [bx, by] of [[px0 + 26, py0 + 30], [px0 + BX - 44, py0 + 30], [px0 + 26, py0 + BY - 40], [px0 + BX - 44, py0 + BY - 40]]) {
    small.push({ kind: "bench", x: bx, y: by });
    solids.push({ x: bx, y: by, w: 18, h: 6 });
  }
  tall.push({ kind: "lamp", x: px0 + 60, y: py0 + 50 }, { kind: "lamp", x: px0 + BX - 60, y: py0 + 50 }, { kind: "lamp", x: px0 + 60, y: py0 + BY - 30 }, { kind: "lamp", x: px0 + BX - 60, y: py0 + BY - 30 });
  small.push({ kind: "bin", x: px0 + 52, y: py0 + 34 });
  const subway = { x: px0 + BX - 40, y: py0 + BY - 22, spawn: { x: px0 + BX - 27, y: py0 + BY + 4 } };
  solids.push({ x: subway.x, y: subway.y - 3, w: 26, h: 15 });
  tall.push({ kind: "sign", x: px0 + 4, y: py0 + 4 });

  const pigeons = [[30, 70], [40, 76], [150, 110], [160, 64], [120, 120]].map(([x, y]) => ({ x: px0 + x, y: py0 + y }));
  const cabLanes: Layout["cabLanes"] = [];
  for (let j = 0; j <= ROWS; j++) {
    const cy = j * (BY + ST);
    cabLanes.push({ y: cy + 3, dir: -1 }, { y: cy + 15, dir: 1 });
  }
  // world edge
  solids.push({ x: -10, y: -10, w: WORLD_W + 20, h: 10 }, { x: -10, y: WORLD_H, w: WORLD_W + 20, h: 10 }, { x: -10, y: 0, w: 10, h: WORLD_H }, { x: WORLD_W, y: 0, w: 10, h: WORLD_H });

  // fill homes near the park first, so the first arrivals live close together
  const cx = px0 + BX / 2, cy = py0 + BY / 2;
  buildings.sort((a, b) => Math.hypot(a.home.x - cx, a.home.y - cy) - Math.hypot(b.home.x - cx, b.home.y - cy));
  cached = { buildings, solids, tall, small, park, parkTree, subway, diner: solids.find((s) => s.w === 124)!, pigeons, cabLanes, towers };
  return cached;
}

// ---- drawing helpers --------------------------------------------------------------
type G = CanvasRenderingContext2D;
const R = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};
const wallOf = (p: Palette, w: Building["wall"]) => (w === "A" ? [p.wallA, p.wallADark] : w === "B" ? [p.wallB, p.wallBDark] : [p.wallC, p.wallCDark]);

function windowAt(g: G, p: Palette, x: number, y: number, lit: boolean) {
  R(g, x - 1, y - 2, 9, 2, p.trim);
  R(g, x - 1, y - 1, 9, 1, p.trimDark);
  R(g, x, y, 7, 10, p.ink);
  R(g, x + 1, y + 1, 5, 8, lit && p.night ? p.lit : p.glass);
  R(g, x + 3, y + 1, 1, 8, p.ink);
  R(g, x + 1, y + 5, 5, 1, p.ink);
  if (!p.night) {
    R(g, x + 1, y + 1, 1, 2, p.white);
    // somebody lives here: a plant on the sill
    if (lit) { R(g, x + 4, y + 7, 2, 2, "#3f9b6e"); R(g, x + 4, y + 9, 2, 1, "#c28a4a"); }
  }
  R(g, x - 1, y + 10, 9, 1, p.trim);
}

function building(g: G, p: Palette, b: Building, occupied: number) {
  const [wall, wallDark] = wallOf(p, b.wall);
  const { x, w, rear, top, base } = b;
  // roof seen from above
  R(g, x, rear, w, top - rear, p.roof);
  R(g, x, top - 2, w, 2, p.roofDark);
  for (let i = 4; i < w - 6 && top - rear > 8; i += 14) R(g, x + i, rear + 3, 5, 4, p.roofDark);
  // facade: wooden clapboard siding on the houses, plaster on the shops
  R(g, x, top, w, base - top, wall);
  if (b.kind === "shop") {
    for (let yy = top + 6; yy < base - 2; yy += 5) for (let xx = x + ((yy / 5) % 2 ? 1 : 4); xx < x + w - 2; xx += 7) R(g, xx, yy, 3, 1, wallDark);
  } else {
    for (let yy = top + 5; yy < base - 2; yy += 3) R(g, x + 1, yy, w - 2, 1, wallDark);
    // corner boards
    R(g, x, top, 2, base - top, p.trimDark);
    R(g, x + w - 2, top, 2, base - top, p.trimDark);
  }

  if (b.kind === "victorian") {
    // a gable rising off the front of the roof, with a little round window
    const gw = w - 6, gx = x + 3, gh = Math.floor(gw / 2) > 12 ? 12 : Math.floor(gw / 2);
    for (let k = 0; k < gh; k++) {
      const half = Math.round(((k + 1) / gh) * (gw / 2));
      const cx = gx + gw / 2;
      R(g, cx - half, top - gh + k, half * 2, 1, p.trim);
      if (half > 2) R(g, cx - half + 2, top - gh + k, half * 2 - 4, 1, wall);
    }
    R(g, gx + gw / 2 - 2, top - 6, 4, 3, p.night ? p.lit : p.glass);
    R(g, gx + gw / 2 - 2, top - 7, 4, 1, p.trim);
  }
  // cornice with dentils
  R(g, x - 1, top, w + 2, 3, p.trim);
  R(g, x - 1, top + 3, w + 2, 1, p.trimDark);
  for (let i = 1; i < w; i += 3) R(g, x + i, top + 4, 1, 1, p.trimDark);

  // bay windows: the san francisco tell. a victorian has one angled bay per
  // floor over the windows left of the door; edwardian flats stack a bay on
  // each side, running the full height.
  const colsN = Math.max(1, Math.floor((w - 4) / 12));
  if (b.kind === "victorian" || b.kind === "flat") {
    const floors = Math.round(b.windows.length / colsN);
    const groups: [number, number][] = b.kind === "victorian" ? [[0, Math.max(0, colsN - 2)]] : colsN >= 3 ? [[0, 0], [colsN - 1, colsN - 1]] : [[0, 0]];
    for (const [c0, c1] of groups) {
      const first = b.windows[c0], last = b.windows[c1];
      if (!first || !last) continue;
      const bx0 = first.x - 3, bx1 = last.x + 10;
      for (let f = 0; f < floors; f++) {
        if (b.kind === "flat" && f > 0) continue;
        const by0 = first.y - 4 + f * 15, by1 = b.kind === "flat" ? first.y + (floors - 1) * 15 + 13 : by0 + 17;
        R(g, bx0, by0, bx1 - bx0, by1 - by0, p.trim);
        R(g, bx0 + 1, by0 + 1, bx1 - bx0 - 2, by1 - by0 - 2, wall);
        // the angled sides catch less light
        R(g, bx0 + 1, by0 + 1, 2, by1 - by0 - 2, wallDark);
        R(g, bx1 - 3, by0 + 1, 2, by1 - by0 - 2, wallDark);
        R(g, bx0 - 1, by0 - 1, bx1 - bx0 + 2, 2, p.trim);
        R(g, bx0, by1, bx1 - bx0, 2, p.shadow);
      }
    }
  }

  // windows: the first ones light up as people move in
  const litCount = Math.min(b.windows.length, occupied * 2);
  b.windows.forEach((win, k) => windowAt(g, p, win.x, win.y, k < litCount));

  if (b.kind === "shop") {
    const sb = base - 24;
    R(g, x, sb, w, 24, wall);
    for (let i = 0; i < w; i += 6) { R(g, x + i, sb - 1, 3, 7, p.white); R(g, x + i + 3, sb - 1, 3, 7, p.wallA); }
    // scalloped valance
    for (let i = 0; i < w; i += 3) { R(g, x + i, sb + 6, 3, 1, i % 6 ? p.wallA : p.white); R(g, x + i + 1, sb + 7, 1, 1, i % 6 ? p.wallA : p.white); }
    R(g, x + 3, sb + 9, w - 6, 15, p.ink);
    R(g, x + 16, sb + 10, 16, 13, p.glass);
    R(g, x + 17, sb + 11, 3, 2, p.white);
    R(g, x + 34, sb + 10, w - 38, 13, p.glass);
    R(g, x + 37, sb + 13, 8, 4, p.trim);
    R(g, x + 4, sb + 10, 10, 14, p.roof);
    R(g, x + 11, sb + 17, 1, 1, p.bulb);
    if (p.night) {
      g.fillStyle = "rgba(246,210,122,0.12)";
      g.fillRect(x + 6, base + 1, w - 12, 3);
      g.fillRect(x + 12, base + 4, w - 24, 2);
    }
  } else {
    // door, transom, railings, stoop
    const dx = b.door;
    R(g, dx - 1, base - 20, 11, 3, p.trim);
    R(g, dx, base - 17, 9, 17, p.ink);
    R(g, dx + 1, base - 16, 7, 2, p.night ? p.lit : p.glass);
    const panel = b.wall === "B" ? p.wallA : p.roof;
    R(g, dx + 1, base - 13, 3, 13, panel);
    R(g, dx + 5, base - 13, 3, 13, panel);
    R(g, dx + 4, base - 6, 1, 1, p.bulb);
    const rx0 = x + 3, rx1 = dx - 4;
    R(g, rx0, base - 7, rx1 - rx0, 1, p.ink);
    for (let i = rx0; i < rx1; i += 3) R(g, i, base - 7, 1, 7, p.ink);
    for (let i = 0; i < 5; i++) {
      R(g, dx - 1 - i, base + 1 + i * 2, 11 + i * 2, 2, p.step);
      R(g, dx - 1 - i, base + 2 + i * 2, 11 + i * 2, 1, p.stepDark);
    }
    R(g, dx - 3, base - 3, 1, 14, p.ink);
    R(g, dx + 11, base - 3, 1, 14, p.ink);
  }
  R(g, x, base, w, 1, p.ink);
}

// A transamerica-style pyramid: tapering to a spire, with the two "wings"
// (lift and stair shafts) standing proud near the top.
function tower(g: G, p: Palette, x: number, rear: number, base: number) {
  const c = p.trim, d = p.trimDark, cx = x + 15;
  const tip = rear - 18, H = base - tip;
  for (let y = tip; y < base; y++) {
    const half = Math.max(1, Math.round(15 * ((y - tip) / H)));
    R(g, cx - half, y, half * 2, 1, c);
    // window grid: columns every 2px, a darker floor line every 4 rows
    if (y > tip + 6 && y < base - 10) {
      if ((y - tip) % 4 === 0) R(g, cx - half + 1, y, half * 2 - 2, 1, d);
      else for (let xx = cx - half + 2; xx < cx + half - 1; xx += 2) R(g, xx, y, 1, 1, d);
    }
  }
  const wy = tip + Math.round(H * 0.2), wh = 14;
  const wHalf = Math.round(15 * ((wy - tip) / H));
  R(g, cx - wHalf - 3, wy, 3, wh, c); R(g, cx - wHalf - 3, wy, 1, wh, d);
  R(g, cx + wHalf, wy, 3, wh, c); R(g, cx + wHalf + 2, wy, 1, wh, d);
  R(g, cx - 1, tip - 8, 2, 8, d);
  R(g, cx - 1, tip - 9, 2, 1, p.night ? p.bulb : d);
  // arcade at the base
  for (let i = 0; i < 4; i++) R(g, x + 3 + i * 7, base - 9, 4, 9, p.ink);
  R(g, x + 11, base - 10, 8, 10, p.ink);
  R(g, x, base, 30, 1, p.ink);
}

// The ferry building: a long arcaded hall with the clock tower in the middle.
// (Still called "diner" in the layout: same footprint, same block.)
function diner(g: G, p: Palette, d: Rect) {
  const { x, y, w } = d;
  const cx = x + w / 2;
  // roof seen from above
  R(g, x + 3, y, w - 6, 26, p.roof);
  R(g, x, y + 3, w, 22, p.roof);
  for (let i = 6; i < w - 6; i += 8) R(g, x + i, y + 6, 4, 14, p.roofDark);
  // clock tower: three stages and a cap
  R(g, cx - 8, y - 6, 16, 40, p.trim);
  R(g, cx - 6, y - 18, 12, 14, p.trim);
  R(g, cx - 4, y - 26, 8, 9, p.trim);
  R(g, cx - 2, y - 31, 4, 6, p.trimDark);
  R(g, cx, y - 35, 1, 4, p.ink);
  for (let i = 0; i < 3; i++) R(g, cx - 7 + i * 5, y + 18, 3, 12, p.trimDark);
  for (let i = 0; i < 2; i++) R(g, cx - 4 + i * 6, y - 15, 2, 9, p.trimDark);
  // clock face
  R(g, cx - 5, y - 2, 10, 10, p.ink);
  R(g, cx - 4, y - 1, 8, 8, p.night ? p.lit : p.white);
  R(g, cx, y + 1, 1, 3, p.ink); R(g, cx, y + 3, 3, 1, p.ink);
  // facade: frieze with the name, then the arcade
  R(g, x, y + 26, w, 4, p.trim);
  R(g, x, y + 30, w, 1, p.trimDark);
  g.fillStyle = p.ink;
  g.font = "600 5px ui-monospace, Menlo, monospace";
  g.textBaseline = "alphabetic";
  g.fillText("FERRY", x + 10, y + 30);
  g.fillText("BUILDING", x + w - 34, y + 30);
  R(g, x, y + 31, w, 35, p.wallB);
  for (let i = 0; i < 10; i++) {
    const ax = x + 4 + i * 12;
    if (Math.abs(ax + 4 - cx) < 8) continue;
    R(g, ax + 1, y + 36, 6, 1, p.ink);
    R(g, ax, y + 37, 8, 13, p.ink);
    R(g, ax + 1, y + 38, 6, 12, p.night ? p.lit : p.glass);
    if (!p.night) R(g, ax + 2, y + 39, 1, 3, p.white);
    R(g, ax, y + 53, 8, 10, p.wallBDark);
  }
  R(g, cx - 6, y + 40, 12, 26, p.trim);
  R(g, cx - 4, y + 44, 8, 22, p.ink);
  R(g, cx - 3, y + 45, 6, 6, p.glass);
  R(g, x, y + 66, w, 1, p.ink);
  for (let i = 0; i < 3; i++) R(g, cx - 8 - i, y + 67 + i * 2, 16 + i * 2, 2, p.step);
}

function smallProp(g: G, p: Palette, s: SmallProp) {
  const { x, y } = s;
  switch (s.kind) {
    case "bench":
      R(g, x, y - 4, 18, 2, p.wallA); R(g, x, y - 1, 18, 2, p.wallA); R(g, x, y - 2, 18, 1, p.ink);
      R(g, x + 2, y + 1, 1, 4, p.ink); R(g, x + 15, y + 1, 1, 4, p.ink);
      break;
    case "planter":
      R(g, x, y, 14, 6, p.wallC); R(g, x, y, 14, 1, p.ink); R(g, x + 1, y + 5, 12, 1, p.wallCDark);
      break;
    case "bin":
      R(g, x, y - 8, 7, 8, p.wallC); R(g, x - 1, y - 9, 9, 2, p.ink); R(g, x + 2, y - 6, 3, 1, p.white);
      break;
    case "hydrant":
      R(g, x, y - 6, 4, 6, "#d9453b"); R(g, x - 1, y - 4, 6, 1, "#a8322a"); R(g, x, y - 7, 4, 1, "#a8322a");
      break;
    case "news":
      R(g, x, y - 9, 6, 9, s.c ?? p.wallA); R(g, x + 1, y - 8, 4, 3, p.white); R(g, x, y - 1, 6, 1, p.ink);
      break;
    case "rack":
      for (let i = 0; i < 4; i++) { R(g, x + i * 5, y - 6, 1, 6, p.ink); R(g, x + i * 5, y - 6, 4, 1, p.ink); R(g, x + i * 5 + 3, y - 6, 1, 6, p.ink); }
      R(g, x + 2, y - 8, 9, 1, "#3f9b6e"); R(g, x + 1, y - 7, 3, 3, p.ink); R(g, x + 9, y - 7, 3, 3, p.ink);
      break;
    case "flowers":
      R(g, x, y - 2, 18, 4, p.wallC); R(g, x, y - 2, 18, 1, p.ink);
      for (let i = 0; i < 8; i++) R(g, x + 1 + i * 2, y - 4 + (i % 2), 1, 2, i % 3 ? "#f2a7c3" : "#f2c14e");
      break;
  }
}

// Ground, streets, buildings and small props: everything that never moves.
export function drawStatic(g: G, p: Palette, occupancy: number[]) {
  const L = layout();
  g.imageSmoothingEnabled = false;
  R(g, 0, 0, WORLD_W, WORLD_H, p.sidewalk);
  for (let y = 0; y < WORLD_H; y += 8) R(g, 0, y, WORLD_W, 1, p.paving);
  for (let x = 0; x < WORLD_W; x += 12) R(g, x, 0, 1, WORLD_H, p.paving);

  // streets
  for (let j = 0; j <= ROWS; j++) R(g, 0, j * (BY + ST), WORLD_W, ST, p.asphalt);
  for (let i = 0; i <= COLS; i++) R(g, i * (BX + ST), 0, ST, WORLD_H, p.asphalt);
  const rr = mulberry(7);
  for (let k = 0; k < 900; k++) {
    const x = Math.floor(rr() * WORLD_W), y = Math.floor(rr() * WORLD_H);
    const onStreet = y % (BY + ST) < ST || x % (BX + ST) < ST;
    if (onStreet) R(g, x, y, 2, 1, p.asphaltLine);
  }
  // curbs around every block
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const x = blockX(i), y = blockY(j);
    R(g, x, y - 1, BX, 1, p.curb); R(g, x, y + BY, BX, 1, p.curb);
    R(g, x - 1, y, 1, BY, p.curb); R(g, x + BX, y, 1, BY, p.curb);
    R(g, x, y, BX, 1, p.curbHi);
  }
  // double centre lines, stopping short of the crossings
  for (let j = 0; j <= ROWS; j++) {
    const cy = j * (BY + ST) + ST / 2;
    for (let i = 0; i < COLS; i++) { const x = blockX(i) + 16; R(g, x, cy - 2, BX - 32, 1, p.lane); R(g, x, cy + 1, BX - 32, 1, p.lane); }
  }
  for (let i = 0; i <= COLS; i++) {
    const cx = i * (BX + ST) + ST / 2;
    for (let j = 0; j < ROWS; j++) { const y = blockY(j) + 16; R(g, cx - 2, y, 1, BY - 32, p.lane); R(g, cx + 1, y, 1, BY - 32, p.lane); }
  }
  // zebra crossings on every side of every intersection
  for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= COLS; i++) {
    const ix = i * (BX + ST), iy = j * (BY + ST);
    for (let k = 2; k < ST - 2; k += 4) {
      if (i > 0) R(g, ix - 13, iy + k, 10, 2, p.white);
      if (i < COLS) R(g, ix + ST + 3, iy + k, 10, 2, p.white);
      if (j > 0) R(g, ix + k, iy - 13, 2, 10, p.white);
      if (j < ROWS) R(g, ix + k, iy + ST + 3, 2, 10, p.white);
    }
  }

  // the park
  const pk = L.park;
  R(g, pk.x - 1, pk.y - 1, pk.w + 2, pk.h + 2, p.curb);
  R(g, pk.x, pk.y, pk.w, pk.h, p.grass);
  const pr = mulberry(3);
  for (let k = 0; k < 160; k++) {
    const x = pk.x + 2 + Math.floor(pr() * (pk.w - 4)), y = pk.y + 2 + Math.floor(pr() * (pk.h - 4));
    R(g, x, y, 1, 2, p.grassDark); R(g, x + 1, y + 1, 1, 1, p.grassDark);
  }
  // gravel paths: a cross and a ring round the tree
  R(g, pk.x, pk.y + pk.h / 2 - 8, pk.w, 18, p.dirt);
  R(g, pk.x + pk.w / 2 - 9, pk.y, 18, pk.h, p.dirt);
  R(g, L.parkTree.x - 26, L.parkTree.y - 30, 52, 44, p.dirt);
  for (let k = 0; k < 120; k++) {
    const x = pk.x + Math.floor(pr() * pk.w), y = pk.y + Math.floor(pr() * pk.h);
    if (Math.abs(y - (pk.y + pk.h / 2)) < 8 || Math.abs(x - (pk.x + pk.w / 2)) < 8) R(g, x, y, 2, 1, p.dirtDark);
  }
  // muni / bart entrance: stairs down, a railing, the two signs on posts
  const sw = L.subway;
  R(g, sw.x, sw.y, 26, 12, p.ink); R(g, sw.x + 2, sw.y + 2, 22, 8, p.asphalt);
  for (let k = 0; k < 4; k++) R(g, sw.x + 3, sw.y + 3 + k * 2, 20, 1, p.asphaltLine);
  R(g, sw.x, sw.y - 3, 26, 1, p.ink);
  for (let k = 0; k < 26; k += 3) R(g, sw.x + k, sw.y - 3, 1, 3, p.ink);
  R(g, sw.x, sw.y - 7, 1, 5, p.ink); R(g, sw.x + 25, sw.y - 7, 1, 5, p.ink);
  g.font = "700 5px ui-monospace, Menlo, monospace";
  g.textBaseline = "alphabetic";
  R(g, sw.x - 3, sw.y - 13, 7, 7, "#d9453b");
  g.fillStyle = "#ffffff"; g.fillText("M", sw.x - 2, sw.y - 8);
  R(g, sw.x + 22, sw.y - 13, 7, 7, "#3b5bdb");
  R(g, sw.x + 23, sw.y - 11, 5, 1, "#ffffff"); R(g, sw.x + 23, sw.y - 9, 5, 1, "#ffffff");

  // buildings, back to front
  L.buildings.forEach((b, k) => {
    if (b.nudge) {
      g.save();
      g.translate(0, 1);
    }
    building(g, p, b, occupancy[k] ?? 0);
    if (b.nudge) g.restore();
  });
  L.towers.forEach((t) => tower(g, p, t.x, t.rear, t.base));
  diner(g, p, L.diner);
  L.small.forEach((s) => smallProp(g, p, s));
}

// Props that can stand in front of people: drawn in the depth-sorted pass.
export function drawTall(g: G, p: Palette, t: TallProp, time: number) {
  const { x, y } = t;
  if (t.kind === "lamp") {
    R(g, x, y - 20, 1, 20, p.ink); R(g, x - 1, y - 1, 3, 1, p.ink);
    R(g, x - 2, y - 24, 5, 4, p.ink); R(g, x - 1, y - 23, 3, 2, p.bulb);
    if (p.night) {
      g.fillStyle = "rgba(246,210,122,0.1)";
      g.fillRect(x - 8, y - 2, 17, 4);
      g.fillRect(x - 5, y - 3, 11, 6);
      g.fillRect(x - 3, y - 4, 7, 8);
    }
  } else if (t.kind === "pine") {
    R(g, x - 1, y - 6, 2, 6, p.ink);
    const rows: [number, number][] = [[0, 1], [-1, 3], [-2, 5], [-1, 3], [-3, 7], [-4, 9], [-3, 7], [-5, 11]];
    rows.forEach(([o, w], k) => R(g, x + o, y - 22 + k * 2, w, 2, k % 3 ? p.leaf : p.leafDark));
  } else if (t.kind === "tree") {
    R(g, x - 2, y - 6, 4, 6, p.ink);
    const rows: [number, number][] = [[0, 1], [-1, 3], [-2, 5], [-1, 3], [-3, 7], [-4, 9], [-3, 7], [-5, 11], [-6, 13], [-4, 9], [-6, 13], [-7, 15], [-5, 11], [-7, 15], [-8, 17], [-6, 13], [-8, 17], [-9, 19], [-10, 21]];
    rows.forEach(([o, w], k) => R(g, x + o, y - 44 + k * 2, w, 2, k % 3 ? p.leaf : p.leafDark));
    R(g, x, y - 48, 1, 4, p.bulb);
    R(g, x - 1, y - 47, 3, 1, p.bulb);
    const lights = [[0, -40], [-3, -34], [3, -31], [-5, -26], [5, -22], [-2, -18], [-7, -14], [7, -12], [2, -10], [-4, -8], [9, -8]];
    const tw = Math.floor(time * 2);
    lights.forEach(([a, b], k) => R(g, x + a, y + b, 1, 1, (k + tw) % 3 === 0 ? p.white : p.bulb));
  } else if (t.kind === "sign") {
    R(g, x, y - 30, 1, 30, p.ink);
    R(g, x - 26, y - 30, 26, 7, "#ffffff");
    R(g, x - 26, y - 30, 26, 1, "#021093"); R(g, x - 26, y - 24, 26, 1, "#021093"); R(g, x - 26, y - 30, 1, 7, "#021093");
    R(g, x + 1, y - 21, 26, 7, "#2f6b4f");
    g.font = "600 5px ui-monospace, Menlo, monospace";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#021093";
    g.fillText("← lj", x - 24, y - 25);
    g.fillStyle = "#ffffff";
    g.fillText("sf →", x + 3, y - 16);
  }
}

// A cable car, side on (kept as drawCab: the world calls it for each lane).
export function drawCab(g: G, p: Palette, x: number, y: number, dir: 1 | -1, t: number) {
  const red = "#b8322b", cream = "#f1e3c2", wood = "#8a5a3b";
  R(g, x + 1, y + 10, 20, 2, p.shadow);
  // roof with the clerestory
  R(g, x, y - 1, 22, 2, wood);
  R(g, x + 4, y - 2, 14, 1, wood);
  // open bench ends, closed middle cabin
  R(g, x, y + 1, 22, 3, cream);
  R(g, x + 6, y + 1, 10, 3, p.glass);
  for (const px of [x + 1, x + 5, x + 16, x + 20]) R(g, px, y + 1, 1, 5, wood);
  R(g, x + 6, y + 1, 1, 3, cream); R(g, x + 11, y + 1, 1, 3, cream); R(g, x + 15, y + 1, 1, 3, cream);
  // riders on the running boards
  R(g, x + 2, y + 1, 2, 2, (t % 4 < 2) ? "#f2a7a0" : "#8a5a3b");
  R(g, x + 17, y + 2, 2, 2, "#c79a5b");
  R(g, x, y + 4, 22, 5, red);
  R(g, x, y + 5, 22, 1, cream);
  R(g, x + 2, y + 7, 18, 1, "#8f2620");
  R(g, x + 3, y + 9, 4, 2, p.ink);
  R(g, x + 15, y + 9, 4, 2, p.ink);
  R(g, dir > 0 ? x + 21 : x, y + 3, 1, 2, p.bulb);
}

export function drawPigeon(g: G, p: Palette, x: number, y: number, hop: boolean, flying: boolean) {
  const c = p.night ? "#8a96b8" : "#6b7591";
  if (flying) {
    R(g, x - 2, y - 1, 2, 1, c); R(g, x + 3, y - 1, 2, 1, c); R(g, x, y, 3, 2, c);
    return;
  }
  const dy = hop ? -1 : 0;
  R(g, x, y - 2 + dy, 4, 2, c); R(g, x + 3, y - 3 + dy, 2, 2, c); R(g, x + 5, y - 2 + dy, 1, 1, "#f2c14e"); R(g, x + 1, y + dy, 1, 1, p.ink);
}

export const inRect = (r: Rect, x: number, y: number, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
