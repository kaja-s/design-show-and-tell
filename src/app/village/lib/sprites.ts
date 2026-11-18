// ---------------------------------------------------------------------------
// Pixel characters. Each villager is a 12x20 chibi sprite composited from
// small ascii layers (body, legs, top, hair, hat, extras, carried thing),
// coloured from their Config. Composites are cached per config + pose, so
// drawing is one drawImage per villager per frame. Client only (canvas).
//
// Letters: o outline  s skin  e eye  r blush  m mouth  C top  c top shade
//          w white  P trousers  K shoes  H hair  A accent (hat, clip, scarf…)
//          G glasses frame  X carried thing  x its detail
// ---------------------------------------------------------------------------
import { cleanConfig, VISITOR, type Config } from "./villager";

export const SPRITE_W = 12;
export const SPRITE_H = 20;
export type Dir = "down" | "up" | "left" | "right";
type Rows = [number, string][];

const OUTLINE = "#1b1d33";

// ---- body ------------------------------------------------------------------
const HEAD: Rows = [
  [2, "...oooooo..."],
  [3, "..osssssso.."],
  [4, ".osssssssso."],
  [5, ".osssssssso."],
  [6, ".osssssssso."],
  [7, ".ossessesso."],
  [8, ".ossessesso."],
  [9, ".osrsmmsrso."],
  [10, "..osssssso.."],
];
const HEAD_SIDE: Rows = [
  [2, "...oooooo..."],
  [3, "..osssssso.."],
  [4, ".osssssssso."],
  [5, ".osssssssso."],
  [6, ".osssssssso."],
  [7, ".osssssesso."],
  [8, ".osssssesso."],
  [9, ".ossssssrso."],
  [10, "..osssssso.."],
];
const HEAD_BACK: Rows = HEAD.map(([r, l]) => [r, l.replace(/[erm]/g, "s")]);
const TORSO: Rows = [
  [11, "...oCCCCo..."],
  [12, "..oCCCCCCo.."],
  [13, ".oCCCCCCCCo."],
  [14, ".oCoCCCCoCo."],
  [15, ".soCCCCCCos."],
  [16, "..oPPPPPPo.."],
];
const LEGS: Rows[] = [
  [[17, "..oPPooPPo.."], [18, "..oPPooPPo.."], [19, "..KKK..KKK.."]],
  [[17, "..oPPooPPo.."], [18, ".oPPo..oPPo."], [19, ".KKK....KKK."]],
  [[17, "..oPPooPPo.."], [18, "..oPPooPPo.."], [19, "..KKK..KKK.."]],
  [[17, "..oPPooPPo.."], [18, "...oPPoPPo.."], [19, "...KKKKKK..."]],
];

// ---- tops (drawn over the torso) -----------------------------------------
const TOPS: Record<Config["top"], Rows> = {
  tee: [],
  stripes: [[12, "...wwwwww..."], [14, "....wwww...."]],
  hoodie: [[11, "..occCCcco.."], [12, "..oCwCCwCo.."], [14, ".oCoccccoCo."], [15, ".soCcccCCos."]],
  jacket: [[11, "...oCwwCo..."], [12, "..oCCwwCCo.."], [13, ".oCCCwwCCCo."], [14, ".oCoCwwCoCo."], [15, ".soCCwwCCos."]],
  puffer: [[11, "..ocCCCCco.."], [12, "..oCCCCCCo.."], [13, "ocCCCcCCCCco"], [14, "oCCoCCCCoCCo"], [15, "osocCcCcCoso"]],
};

// ---- hair --------------------------------------------------------------------
const HAIR: Record<Config["hair"], Rows> = {
  none: [],
  short: [[2, "...oooooo..."], [3, "..oHHHHHHo.."], [4, ".oHHHHHHHHo."], [5, ".oHHHHHHHHo."], [6, ".oHHssssHHo."]],
  messy: [[1, "...o.oo.o..."], [2, "..oHoHHoHo.."], [3, "..oHHHHHHo.."], [4, ".oHHHHHHHHo."], [5, ".oHHHHHHHHo."], [6, ".oHsHssHsHo."]],
  bun: [[0, "....oooo...."], [1, "...oHHHHo..."], [2, "...oooooo..."], [3, "..oHHHHHHo.."], [4, ".oHHHHHHHHo."], [5, ".oHHHHHHHHo."], [6, ".oHHssssHHo."]],
  ponytail: [[2, "...oooooo..."], [3, "..oHHHHHHoo."], [4, ".oHHHHHHHHHo"], [5, ".oHHHHHHHHHo"], [6, ".oHHssssHHHo"], [7, "..........Ho"], [8, "..........Ho"], [9, "...........o"]],
  long: [[2, "...oooooo..."], [3, "..oHHHHHHo.."], [4, ".oHHHHHHHHo."], [5, "oHHHHHHHHHHo"], [6, "oHHHssssHHHo"],
    [7, "oH........Ho"], [8, "oH........Ho"], [9, "oH........Ho"], [10, "oHH......HHo"], [11, "oHH......HHo"], [12, "oHH......HHo"], [13, ".oH......Ho."]],
  curly: [[1, "...oHoHoHo.."], [2, "..oHHHHHHHo."], [3, ".oHHHHHHHHHo"], [4, "oHHHHHHHHHHo"], [5, "oHHHHHHHHHHo"], [6, "oHHssssssHHo"], [7, "oH........Ho"], [8, ".o........o."]],
};
// covers the back of the head when facing right (mirrored for left)
const HAIR_SIDE: Rows = [[5, ".oHHHH......"], [6, ".oHHHH......"], [7, ".oHH........"], [8, ".oH........."]];
const HAIR_BACK_FILL: Rows = [[3, "..oHHHHHHo.."], [4, ".oHHHHHHHHo."], [5, ".oHHHHHHHHo."], [6, ".oHHHHHHHHo."], [7, ".oHHHHHHHHo."], [8, ".oHHHHHHHHo."], [9, ".oHHHHHHHHo."], [10, "..oHHHHHHo.."]];
const HAIR_BACK_EXTRA: Partial<Record<Config["hair"], Rows>> = {
  long: [[10, "oHHHHHHHHHHo"], [11, "oHHHHHHHHHHo"], [12, "oHHHHHHHHHHo"], [13, ".oHHHHHHHHo."]],
  ponytail: [[10, "....oHHo...."], [11, "....oHHo...."], [12, ".....oo....."]],
  curly: [[4, "oHHHHHHHHHHo"], [5, "oHHHHHHHHHHo"], [9, "oHHHHHHHHHHo"]],
};

// ---- hats / extras / carry -------------------------------------------------------
const HATS: Record<Config["hat"], Rows> = {
  none: [],
  beanie: [[0, ".....ww....."], [1, "....oAAo...."], [2, "...oAAAAo..."], [3, "..oAAAAAAo.."], [4, ".oAAAAAAAAo."], [5, ".owwwwwwwwo."]],
  cap: [[1, "....oooo...."], [2, "...oAAAAo..."], [3, "..oAAAAAAo.."], [4, ".oAAAAwAAAo."], [5, ".oAAAAAAAAAA"]],
};
const CAP_BACK: Rows = [[1, "....oooo...."], [2, "...oAAAAo..."], [3, "..oAAAAAAo.."], [4, ".oAAAAAAAAo."], [5, ".oAAAAAAAAo."]];
const EXTRAS: Record<Config["extra"], Rows> = {
  none: [],
  glasses: [[7, ".osGeGGeGso."]],
  headphones: [[3, "..A......A.."], [5, "AA........AA"], [6, "AA........AA"], [7, "AA........AA"]],
  clip: [[4, "........AwA."], [5, ".........A.."]],
  scarf: [[11, "..AAAAAAAA.."], [12, "..AA........"], [13, "..AA........"]],
};
const GLASSES_SIDE: Rows = [[7, "......GeG..."]];
const CARRY: Record<Config["carry"], Rows> = {
  none: [],
  coffee: [[13, "wo.........."], [14, "XX.........."], [15, "Xx.........."]],
  tote: [[12, "..........o."], [13, ".........oXo"], [14, ".........XXX"], [15, ".........XxX"], [16, ".........XXX"]],
  basket: [[13, "........oXXo"], [14, "........XxxX"], [15, "........XXXX"], [16, "........oXXo"]],
  sketchbook: [[13, "XXXX........"], [14, "XwwX........"], [15, "XwwX........"], [16, "XXXX........"]],
};
const CARRY_COLORS: Record<Config["carry"], [string, string]> = {
  none: ["#000000", "#000000"],
  coffee: ["#f4f4f4", "#8a5a3b"],
  tote: ["#ece3cf", "#3b5bdb"],
  basket: ["#c28a4a", "#8a5a3b"],
  sketchbook: ["#262a40", "#f4f4f4"],
};
const WAVE: Rows[] = [
  [[9, "..........s."], [10, "..........o."], [11, "..........C."]],
  [[9, "...........s"], [10, "..........os"], [11, "..........C."]],
];

// ---- pets (facing left; mirrored for right) ------------------------------------
export const PET_W = 11;
export const PET_H = 7;
const PETS: Record<Exclude<Config["pet"], "none">, { rows: string[][]; color: string }> = {
  dog: {
    color: "#c79a5b",
    rows: [
      ["..oo.......", ".oTTo......", "oTeTTo...o.", "oTTTTooooTo", ".ooTTTTTTo.", "..oTTTTTTo.", "..oo.o.oo.."],
      ["..oo.......", ".oTTo......", "oTeTTo....o", "oTTTTooooTo", ".ooTTTTTTo.", "..oTTTTTTo.", "...oo.oo..."],
    ],
  },
  cat: {
    color: "#4b5568",
    rows: [
      [".o.o.......", "oToTo......", "oeTeo....o.", "oTTTo....o.", ".oTTTTTTTo.", ".oTTTTTTTo.", ".o.o..o.o.."],
      [".o.o.......", "oToTo......", "oeTeo.....o", "oTTTo....o.", ".oTTTTTTTo.", ".oTTTTTTTo.", "..o.o.o.o.."],
    ],
  },
};

// ---- compositing -------------------------------------------------------------------
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
function paint(g: CanvasRenderingContext2D, rows: Rows, pal: Record<string, string>, dy = 0, mirror = false) {
  for (const [r, line] of rows) {
    for (let i = 0; i < line.length; i++) {
      const c = pal[line[i]];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(mirror ? SPRITE_W - 1 - i : i, r + dy, 1, 1);
    }
  }
}

export type Pose = { dir: Dir; frame: number; blink?: boolean; wave?: number };
const cache = new Map<string, HTMLCanvasElement>();

// One pose of one character as a 12x20 canvas (transparent background).
export function sprite(raw: Config | unknown, pose: Pose): HTMLCanvasElement {
  const c = cleanConfig(raw) ?? VISITOR;
  const key = JSON.stringify(c) + `|${pose.dir}|${pose.frame % 4}|${pose.blink ? 1 : 0}|${pose.wave ?? -1}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 4000) cache.clear();

  const cv = document.createElement("canvas");
  cv.width = SPRITE_W;
  cv.height = SPRITE_H;
  const g = cv.getContext("2d")!;
  const [carryMain, carryDetail] = CARRY_COLORS[c.carry];
  const pal: Record<string, string> = {
    o: OUTLINE, s: c.skin, e: pose.blink ? c.skin : OUTLINE, r: "#f2a7a0", m: "#b5524a", C: c.topColor, c: shade(c.topColor, 0.8),
    w: "#ffffff", P: c.pants, K: "#262a40", H: c.hair === "none" ? c.skin : c.hairColor, A: c.accent, G: OUTLINE, X: carryMain, x: carryDetail,
  };
  const side = pose.dir === "left" || pose.dir === "right";
  const mirror = pose.dir === "left";
  const back = pose.dir === "up";
  const bob = pose.frame % 2 === 1 ? -1 : 0;

  paint(g, LEGS[pose.frame % 4], pal, 0, mirror);
  paint(g, TORSO, pal, bob, mirror);
  paint(g, TOPS[c.top], pal, bob, mirror);
  if (!back && c.extra === "scarf") paint(g, EXTRAS.scarf, pal, bob, mirror);
  if (back) {
    paint(g, HEAD_BACK, pal, bob);
    if (c.hair !== "none") {
      paint(g, HAIR_BACK_FILL, pal, bob);
      paint(g, HAIR[c.hair].filter(([r]) => r <= 2), pal, bob);
      const extra = HAIR_BACK_EXTRA[c.hair];
      if (extra) paint(g, extra, pal, bob);
    }
    if (c.hat === "cap") paint(g, CAP_BACK, pal, bob);
    else if (c.hat === "beanie") paint(g, HATS.beanie, pal, bob);
    if (c.extra === "headphones") paint(g, EXTRAS.headphones, pal, bob);
    if (c.extra === "scarf") paint(g, [[11, "..AAAAAAAA.."]], pal, bob);
    if (c.carry === "tote") paint(g, CARRY.tote, pal, bob, true);
  } else {
    paint(g, side ? HEAD_SIDE : HEAD, pal, bob, mirror);
    paint(g, HAIR[c.hair], pal, bob, mirror);
    if (side && c.hair !== "none") paint(g, HAIR_SIDE, pal, bob, mirror);
    paint(g, HATS[c.hat], pal, bob, mirror);
    if (c.extra === "glasses") paint(g, side ? GLASSES_SIDE : EXTRAS.glasses, pal, bob, mirror);
    else if (c.extra !== "scarf" && c.extra !== "none") paint(g, EXTRAS[c.extra], pal, bob, mirror);
    paint(g, CARRY[c.carry], pal, bob, mirror);
    if (pose.wave !== undefined && pose.wave >= 0) paint(g, WAVE[pose.wave % 2], pal, bob, mirror);
  }
  cache.set(key, cv);
  return cv;
}

export function petSprite(kind: Config["pet"], frame: number, facing: "left" | "right"): HTMLCanvasElement | null {
  if (kind === "none") return null;
  const key = `pet|${kind}|${frame % 2}|${facing}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = PETS[kind];
  const cv = document.createElement("canvas");
  cv.width = PET_W;
  cv.height = PET_H;
  const g = cv.getContext("2d")!;
  const pal: Record<string, string> = { o: OUTLINE, T: p.color, e: OUTLINE };
  p.rows[frame % 2].forEach((line, r) => {
    for (let i = 0; i < line.length; i++) {
      const col = pal[line[i]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(facing === "right" ? PET_W - 1 - i : i, r, 1, 1);
    }
  });
  cache.set(key, cv);
  return cv;
}

// A head-and-shoulders portrait as a data url, for avatars when there's no photo.
const portraits = new Map<string, string>();
export function portrait(raw: Config | unknown): string {
  const c = cleanConfig(raw) ?? VISITOR;
  const key = JSON.stringify(c);
  const hit = portraits.get(key);
  if (hit) return hit;
  const S = 8, size = 14;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size * S;
  const g = cv.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#dbe8ff";
  g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(sprite(c, { dir: "down", frame: 0 }), 0, 0, SPRITE_W, 14, S, S, SPRITE_W * S, 14 * S);
  const url = cv.toDataURL("image/png");
  portraits.set(key, url);
  return url;
}
