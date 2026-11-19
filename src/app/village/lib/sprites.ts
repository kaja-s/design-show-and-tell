// ---------------------------------------------------------------------------
// Pixel characters. Each villager is a 16x26 chibi sprite composited from
// small ascii layers (body, legs, top, hair, hat, extras, carried thing),
// coloured from their Config. Composites are cached per config + pose, so
// drawing is one drawImage per villager per frame. Client only (canvas).
//
// Letters: o outline  s skin  e eye  r blush  m mouth  C top  c top shade
//          h eye highlight  w white  P trousers  K shoes  H hair  A accent (hat, clip, scarf…)
//          G glasses frame  X carried thing  x its detail
// ---------------------------------------------------------------------------
import { cleanConfig, VISITOR, type Config } from "./villager";

export const SPRITE_W = 16;
export const SPRITE_H = 26;
export type Dir = "down" | "up" | "left" | "right";
type Rows = [number, string][];

// The "spin" hello as one turn of the whole body: an eased full rotation
// (front → right → back → left → front). Each quarter swaps to that view's
// sprite at its narrowest, and the width follows the turn, so it reads as
// the figure rotating rather than the sprite flicking between frames.
// `p` is progress 0..1; `angle` is in radians (for anything orbiting along).
export const SPIN_SEC = 0.9;
const TURN: Dir[] = ["down", "right", "up", "left"];
export function spinPose(p: number): { dir: Dir; squash: number; angle: number } {
  const q = Math.min(1, Math.max(0, p));
  const eased = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
  const angle = eased * Math.PI * 2;
  return { dir: TURN[Math.round(angle / (Math.PI / 2)) % 4], squash: 0.55 + 0.45 * Math.abs(Math.cos(angle * 2)), angle };
}

const OUTLINE = "#1b1d33";

// Rows may be shorter than 16 (the rest stays clear). "_" clears a pixel.
const row = (r: number, s: string): [number, string] => [r, s];
const rows = (from: number, to: number, s: string): Rows => Array.from({ length: to - from + 1 }, (_, i) => row(from + i, s));

// ---- body ------------------------------------------------------------------
const HEAD: Rows = [
  row(2, "....oooooooo...."),
  row(3, "...o" + "s".repeat(8) + "o..."),
  row(4, "..o" + "s".repeat(10) + "o.."),
  ...rows(5, 8, ".o" + "s".repeat(12) + "o."),
  row(9, ".ossshesshessso."),
  row(10, ".ossseesseessso."),
  row(11, ".osrrssmmssrrso."),
  row(12, "..o" + "s".repeat(10) + "o.."),
  row(13, "...oossssssoo..."),
];
const HEAD_SIDE: Rows = [
  ...HEAD.filter(([r]) => r < 9),
  row(9, ".osssssssshesso."),
  row(10, ".osssssssseesso."),
  row(11, ".ossssssssrrsso."),
  row(12, "..osssssssssmso."),
  row(13, "...oossssssoo..."),
];
const HEAD_BACK: Rows = HEAD.map(([r, l]) => [r, l.replace(/[ermh]/g, "s")]);
const TORSO: Rows = [
  row(14, "....oCCCCCCo...."),
  row(15, "...oCCCCCCCCo..."),
  row(16, "..oCCCCCCCCCCo.."),
  row(17, "..oCoCCCCCCoCo.."),
  row(18, "..oCoCCCCCCoCo.."),
  row(19, "..osoCCCCCCoso.."),
  row(20, "..ooPPPPPPPPoo.."),
];
const LEGS: Rows[] = [
  [row(21, "...oPPPooPPPo..."), row(22, "...oPPPooPPPo..."), row(23, "...oPPPooPPPo..."), row(24, "..oKKKKooKKKKo.."), row(25, "...oooo..oooo...")],
  [row(20, "..ooPPPPPPPPoo.."), row(21, "...oPPPooPPPo..."), row(22, "..oPPPo..oPPPo.."), row(23, ".oPPPo....oPPPo."), row(24, ".oKKKKo..oKKKKo."), row(25, "..oooo....oooo..")],
  [row(21, "...oPPPooPPPo..."), row(22, "...oPPPooPPPo..."), row(23, "...oPPPooPPPo..."), row(24, "..oKKKKooKKKKo.."), row(25, "...oooo..oooo...")],
  [row(20, "..ooPPPPPPPPoo.."), row(21, "...oPPPooPPPo..."), row(22, "....oPPPPPPo...."), row(23, "....oPPPPPPo...."), row(24, "....oKKKKKKo...."), row(25, ".....oooooo.....")],
];

// ---- tops (drawn over the torso) -----------------------------------------
const TOPS: Record<Config["top"], Rows> = {
  tee: [row(14, "......ssss......")],
  stripes: [row(16, "...wwwwwwwwww..."), row(18, ".....wwwwww....."), row(20, "")],
  hoodie: [row(14, "...occCCCCcco..."), row(15, "...oCwCCCCwCo..."), row(16, "..oCCwCCCCwCCo.."), row(17, "..oCoccccccoCo.."), row(18, "..oCoCccccCoCo..")],
  jacket: [row(14, "....oCwwwwCo...."), row(15, "...oCcwwwwcCo..."), row(16, "..oCCCcwwcCCCo.."), row(17, "..oCoCCwwCCoCo.."), row(18, "..oCoCCwwCCoCo.."), row(19, "..osoCCwwCCoso..")],
  puffer: [row(14, "...ocCCCCCCco..."), row(15, "..ocCCCCCCCCco.."), row(16, ".oCCCCCCCCCCCCo."), row(17, ".oCoccccccccoCo."), row(18, ".oCoCCCCCCCCoCo."), row(19, ".osocccccccc" + "oso.")],
};

// ---- hair --------------------------------------------------------------------
const HAIR_TOP: Rows = [row(2, "....oooooooo...."), row(3, "...oHHHHHHHHo..."), row(4, "..oHHHHHHHHHHo.."), ...rows(5, 6, ".oHHHHHHHHHHHHo.")];
const HAIR: Record<Config["hair"], Rows> = {
  none: [],
  short: [...HAIR_TOP, row(7, ".oHHHHssssHHHHo."), row(8, ".oHHssssssssHHo."), row(9, ".oH")],
  messy: [row(1, "...o.oo..oo.o..."), row(2, "...oHoHooHoHo..."), ...HAIR_TOP.slice(1), row(7, ".oHsHHssHHssHHo."), row(8, ".oHssssssssssHo.")],
  bun: [row(0, ".....oooooo....."), row(1, "....oHHHHHHo...."), ...HAIR_TOP, row(7, ".oHHHssssssHHHo."), row(8, ".oHssssssssssHo.")],
  ponytail: [row(2, "....oooooooo...."), row(3, "...oHHHHHHHHoo.."), row(4, "..oHHHHHHHHHHHo."), ...rows(5, 6, ".oHHHHHHHHHHHHHo"),
    row(7, ".oHHHssssssHHHHo"), row(8, ".oHssssssssssHHo"), ...rows(9, 11, "..............Ho"), row(12, "...............o")],
  long: [...HAIR_TOP.slice(0, 3), ...rows(5, 6, "oHHHHHHHHHHHHHHo"), row(7, "oHHHHssssssHHHHo"),
    ...rows(8, 12, "oHH..........HHo"), ...rows(13, 15, "oHHo........oHHo"), row(16, ".oo..........oo.")],
  curly: [row(1, "...oHoHoHoHoHo.."), row(2, "..oHHHHHHHHHHo.."), row(3, ".oHHHHHHHHHHHHo."), ...rows(4, 6, "oHHHHHHHHHHHHHHo"),
    row(7, "oHHsHHssssHHsHHo"), ...rows(8, 9, "oHH..........HHo"), row(10, ".oH..........Ho.")],
};
// covers the back of the head when facing right (mirrored for left)
const HAIR_SIDE: Rows = [...rows(7, 8, ".oHHHHHH"), row(9, ".oHHHHH"), row(10, ".oHHHH"), row(11, ".oHHH"), row(12, "..oH")];
const HAIR_BACK_FILL: Rows = [row(3, "...oHHHHHHHHo..."), row(4, "..oHHHHHHHHHHo.."), ...rows(5, 11, ".oHHHHHHHHHHHHo."), row(12, "..oHHHHHHHHHHo..")];
const HAIR_BACK_EXTRA: Partial<Record<Config["hair"], Rows>> = {
  long: [...rows(12, 15, "oHHHHHHHHHHHHHHo"), row(16, ".oHHHHHHHHHHHHo.")],
  ponytail: [...rows(12, 14, "......oHHo......"), row(15, ".......oo.......")],
  curly: [...rows(4, 9, "oHHHHHHHHHHHHHHo"), row(10, ".oHHHHHHHHHHHHo.")],
};

// ---- hats / extras / carry -------------------------------------------------------
const HATS: Record<Config["hat"], Rows> = {
  none: [],
  beanie: [row(0, "......owwo......"), row(1, ".....oAAAAo....."), row(2, "....oAAAAAAo...."), row(3, "...oAAAAAAAAo..."),
    row(4, "..oAAAAAAAAAAo.."), row(5, ".oAAAAAAAAAAAAo."), row(6, ".owAwAwAwAwAwAo.")],
  cap: [row(1, ".....oooooo....."), row(2, "....oAAAAAAo...."), row(3, "...oAAAAAAAAo..."), row(4, "..oAAAAAAAAAAo.."),
    row(5, ".oAAAAAwwAAAAAo."), row(6, ".oAAAAAAAAAAAAAA"), row(7, "..........oooooo")],
};
const CAP_BACK: Rows = [...HATS.cap.slice(0, 4), row(5, ".oAAAAAAAAAAAAo."), row(6, ".oAAAAAwwAAAAAo.")];
const EXTRAS: Record<Config["extra"], Rows> = {
  none: [],
  glasses: [row(8, "....GGGGGGGG...."), row(9, "..GGG..GG..GGG.."), row(10, "....G..GG..G....")],
  headphones: [row(1, "....AAAAAAAA...."), row(2, "...A........A..."), row(3, "..A..........A.."), ...rows(4, 5, ".A............A."), ...rows(6, 9, "AA............AA")],
  clip: [row(5, "..........AwA..."), row(6, "...........A....")],
  scarf: [...rows(13, 14, "...AAAAAAAAAA..."), ...rows(15, 17, "...AA")],
};
const GLASSES_SIDE: Rows = [row(8, ".........GGGG..."), row(9, ".....GGGGG..G..."), row(10, ".........G..G...")];
const CARRY: Record<Config["carry"], Rows> = {
  none: [],
  coffee: [row(16, ".ow"), row(17, ".ww"), row(18, ".XX"), row(19, ".Xx"), row(20, ".XX")],
  tote: [row(19, ".............o.o"), ...rows(20, 23, "............XXXX").map(([r, l]) => [r, r === 21 ? "............XxxX" : l] as [number, string])],
  basket: [row(18, ".............oo."), row(19, "............o..o"), row(20, "............XXXX"), row(21, "............XxxX"), row(22, "............xXXx"), row(23, ".............XX.")],
  sketchbook: [row(17, "XXXX"), ...rows(18, 20, "XwwX"), row(21, "XXXX")],
};
const CARRY_COLORS: Record<Config["carry"], [string, string]> = {
  none: ["#000000", "#000000"],
  coffee: ["#f4f4f4", "#8a5a3b"],
  tote: ["#ece3cf", "#3b5bdb"],
  basket: ["#c28a4a", "#8a5a3b"],
  sketchbook: ["#262a40", "#f4f4f4"],
};
// the right arm comes up to wave (and its resting pixels are cleared)
const WAVE_DOWN: Rows = rows(17, 19, "...........o___");
const WAVE: Rows[] = [
  [...WAVE_DOWN, row(11, "............oso"), row(12, "............oso"), row(13, "............oCo"), row(14, "............oCo"), row(15, "............CC"), row(16, "...........oCCo")],
  [...WAVE_DOWN, row(10, ".............oso"), row(11, ".............oso"), row(12, "............oCo"), row(13, "............oCo"), row(14, "...........oCo"), row(15, "............CC"), row(16, "...........oCCo")],
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
      const x = mirror ? SPRITE_W - 1 - i : i;
      if (line[i] === "_") {
        g.clearRect(x, r + dy, 1, 1);
        continue;
      }
      const c = pal[line[i]];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(x, r + dy, 1, 1);
    }
  }
}

export type Pose = { dir: Dir; frame: number; blink?: boolean; wave?: number };
const cache = new Map<string, HTMLCanvasElement>();

// One pose of one character as a 16x26 canvas (transparent background).
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
    o: OUTLINE, s: c.skin, e: pose.blink ? c.skin : OUTLINE, h: pose.blink ? c.skin : "#ffffff", r: "#f2a7a0", m: "#b5524a", C: c.topColor, c: shade(c.topColor, 0.8),
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
    if (c.extra === "scarf") paint(g, EXTRAS.scarf.slice(0, 2), pal, bob);
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
  // head and shoulders: the top 18 rows, centred in an 18px square
  const S = 6, size = 18;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size * S;
  const g = cv.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#dbe8ff";
  g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(sprite(c, { dir: "down", frame: 0 }), 0, 0, SPRITE_W, size, S, S, SPRITE_W * S, size * S);
  const url = cv.toDataURL("image/png");
  portraits.set(key, url);
  return url;
}
