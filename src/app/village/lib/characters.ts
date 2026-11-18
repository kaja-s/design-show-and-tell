// ---------------------------------------------------------------------------
// Mii-style villagers, built from primitives (no model files): an egg head,
// a rounded body, and every option from the join form (hair, hats, coats,
// scarves, extras, costumes). Poses are procedural, so idle, walk and the
// three hello moves need no rig. Also renders the portrait used as a
// villager's profile picture when they didn't upload a photo.
// ---------------------------------------------------------------------------
import * as THREE from "three";
import type { Config } from "./villager";

const PI = Math.PI;

export const gradientMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const mats = new Map<string, THREE.Material>();
export function toon(color: string) {
  let m = mats.get(color);
  if (!m) mats.set(color, (m = new THREE.MeshToonMaterial({ color, gradientMap })));
  return m;
}
const soft = (color: string) => {
  const k = "soft" + color;
  let m = mats.get(k);
  if (!m) mats.set(k, (m = new THREE.MeshPhongMaterial({ color, shininess: 14, specular: 0x222222 })));
  return m;
};
const gloss = (color: string) => {
  const k = "gloss" + color;
  let m = mats.get(k);
  if (!m) mats.set(k, (m = new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x555555 })));
  return m;
};
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0b1440, transparent: true, opacity: 0.16, depthWrite: false });
const glassMat = new THREE.MeshPhongMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.28, shininess: 120, depthWrite: false });

const geos = new Map<string, THREE.BufferGeometry>();
const memo = (k: string, f: () => THREE.BufferGeometry) => {
  let g = geos.get(k);
  if (!g) geos.set(k, (g = f()));
  return g;
};
export const sph = (r: number) => memo(`s${r}`, () => new THREE.SphereGeometry(r, 24, 16));
const hemi = (r: number) => memo(`h${r}`, () => new THREE.SphereGeometry(r, 24, 12, 0, PI * 2, 0, PI / 2));
const cap = (r: number, l: number) => memo(`c${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 5, 14));
export const cyl = (rt: number, rb: number, h: number, s = 20) => memo(`y${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const tor = (r: number, t: number, arc = PI * 2) => memo(`t${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
export const cone = (r: number, h: number, s = 12) => memo(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
export const box = (w: number, h: number, d: number) => memo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const octa = (r: number) => memo(`o${r}`, () => new THREE.OctahedronGeometry(r));

type Mk = (geo: THREE.BufferGeometry, color: string, x?: number, y?: number, z?: number) => THREE.Mesh;
export const maker =
  (m: (c: string) => THREE.Material): Mk =>
  (geo, color, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m(color));
    mesh.position.set(x, y, z);
    return mesh;
  };

export type Parts = {
  root: THREE.Group;
  rig: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  handL: THREE.Group;
  handR: THREE.Group;
  headR: number;
  chestY: number;
  frontZ: number;
  backZ: number;
  torsoR: number;
  top: number; // height of the top of the head (plus hat), for labels and the bubble
};

const COSTUME_OVERRIDES: Partial<Record<Config["costume"], Partial<Config>>> = {
  santa: { coatColor: "#c8102e", pants: "#c8102e", hat: "none", coat: "puffer" },
  elf: { coatColor: "#2e8b57", pants: "#c8102e", hat: "none" },
  reindeer: { coatColor: "#8a5a3c", pants: "#6b4430", hat: "none" },
  penguin: { coatColor: "#1e2433", pants: "#1e2433", hat: "none", hair: "none", scarf: null },
  snowman: { coatColor: "#f4f8ff", pants: "#f4f8ff", hat: "none", coat: "puffer" },
  skier: { hat: "none", coat: "puffer" },
  astronaut: { coatColor: "#f4f6fb", pants: "#f4f6fb", hat: "none", scarf: null, coat: "puffer" },
  wizard: { coatColor: "#4b2a8a", pants: "#2a1a55", hat: "none", coat: "long coat" },
  dino: { coatColor: "#5fa38a", pants: "#5fa38a", hat: "none", hair: "none", coat: "hoodie" },
};
const wear = (c: Config): Config => ({ ...c, ...(COSTUME_OVERRIDES[c.costume] ?? {}) });

function mkLeg(rig: THREE.Group, mk: Mk, x: number, y: number, col: string) {
  const p = new THREE.Group();
  p.position.set(x, y, 0);
  rig.add(p);
  p.add(mk(cap(0.1, 0.32), col, 0, -(0.16 + 0.05), 0));
  p.add(mk(box(0.18, 0.12, 0.28), "#1b2340", 0, -y + 0.06, 0.04));
  return p;
}
function mkArm(body: THREE.Group, mk: Mk, x: number, y: number, col: string, skin: string) {
  const p = new THREE.Group();
  p.position.set(x, y, 0);
  body.add(p);
  p.add(mk(cap(0.08, 0.34), col, 0, -(0.17 + 0.048), 0));
  const hand = new THREE.Group();
  hand.position.y = -(0.34 + 0.096);
  p.add(hand);
  hand.add(mk(sph(0.09), skin));
  return { p, hand };
}
function coatDetails(body: THREE.Group, c: Config, mk: Mk, y: number, r: number, hh: number) {
  if (c.coat === "puffer")
    for (const k of [-0.5, 0.4]) {
      const t = mk(tor(r * 1.02, r * 0.15), c.coatColor, 0, y + hh * k, 0);
      t.rotation.x = PI / 2;
      body.add(t);
    }
  if (c.coat === "hoodie") {
    const h = mk(tor(r * 0.6, r * 0.28), c.coatColor, 0, y + hh + r * 0.45, -r * 0.55);
    h.rotation.x = PI / 2.4;
    body.add(h);
    body.add(mk(box(r * 0.9, r * 0.35, 0.06), c.coatColor, 0, y - hh * 0.4, r * 0.95));
  }
  if (c.coat === "long coat") {
    body.add(mk(cyl(r * 1.02, r * 1.3, hh * 1.4), c.coatColor, 0, y - hh - hh * 0.4, 0));
    for (const k of [0.3, -0.2]) body.add(mk(sph(0.035), "#0b1030", 0, y + hh * k, r * 1.01));
  }
}
function scarfAt(body: THREE.Group, c: Config, mk: Mk, y: number, r: number, z: number) {
  if (!c.scarf) return;
  const s = mk(tor(r, Math.max(0.06, r * 0.3)), c.scarf, 0, y, 0);
  s.rotation.x = PI / 2;
  body.add(s);
  const t = mk(box(0.13, 0.3, 0.06), c.scarf, r * 0.45, y - 0.18, z + 0.02);
  t.rotation.z = 0.15;
  body.add(t);
}
// hair, hats, glasses and headphones, modelled around a .36 head and scaled to fit
function decorateHead(head: THREE.Group, c: Config, mk: Mk) {
  const covered = c.hat === "beanie" || c.hat === "bobble hat" || c.hat === "ushanka";
  if (c.hair !== "none") {
    if (!covered && c.hair !== "mohawk" && c.hair !== "curly") {
      const h = mk(hemi(0.385), c.hairColor, 0, 0.02, -0.01);
      h.rotation.x = -0.35;
      head.add(h);
    }
    if (c.hair === "bun" && !covered) head.add(mk(sph(0.15), c.hairColor, 0, 0.36, -0.2));
    if (c.hair === "long") {
      const lh = mk(cap(0.3, 0.25), c.hairColor, 0, -0.12, -0.17);
      lh.scale.set(1.15, 1, 0.6);
      head.add(lh);
    }
    if (c.hair === "curly" && !covered) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * PI * 2;
        head.add(mk(sph(0.13), c.hairColor, Math.cos(a) * 0.3, 0.2 + (i % 2) * 0.07, Math.sin(a) * 0.3 - 0.06));
      }
      head.add(mk(sph(0.13), c.hairColor, 0, 0.37, -0.02));
    }
    if (c.hair === "mohawk" && !covered)
      for (let i = 0; i < 6; i++) {
        const a = -1.2 + i * 0.38;
        const s = mk(box(0.08, 0.2, 0.13), c.hairColor, 0, Math.cos(a) * 0.4, Math.sin(a) * 0.4);
        s.rotation.x = a;
        head.add(s);
      }
  }
  if (c.hat === "beanie" || c.hat === "bobble hat") {
    const d = mk(hemi(0.4), c.hatColor, 0, 0.04, 0);
    d.rotation.x = -0.2;
    head.add(d);
    const cuff = mk(tor(0.39, 0.07), c.hatColor, 0, 0.06, 0.01);
    cuff.rotation.x = PI / 2 - 0.2;
    head.add(cuff);
    if (c.hat === "bobble hat") head.add(mk(sph(0.11), "#ffffff", 0, 0.46, -0.08));
  }
  if (c.hat === "earmuffs") {
    head.add(mk(tor(0.41, 0.035, PI), c.hatColor));
    for (const x of [-0.38, 0.38]) head.add(mk(sph(0.12), c.hatColor, x, 0, 0));
  }
  if (c.hat === "ushanka") {
    head.add(mk(cyl(0.39, 0.42, 0.28, 24), c.hatColor, 0, 0.25, 0));
    for (const x of [-0.38, 0.38]) head.add(mk(box(0.1, 0.32, 0.3), "#e8e2d6", x, -0.02, -0.02));
    head.add(mk(box(0.5, 0.14, 0.08), "#e8e2d6", 0, 0.16, 0.36));
  }
  if (c.extra === "glasses") {
    for (const x of [-0.12, 0.12]) head.add(mk(tor(0.085, 0.017), "#0b1030", x, 0.03, 0.36));
    head.add(mk(box(0.08, 0.02, 0.02), "#0b1030", 0, 0.03, 0.37));
  }
  if (c.extra === "headphones") {
    head.add(mk(tor(0.41, 0.035, PI), "#1e293b"));
    for (const x of [-0.39, 0.39]) {
      const cp = mk(cyl(0.12, 0.12, 0.1, 16), "#1e293b", x, 0, 0);
      cp.rotation.z = PI / 2;
      head.add(cp);
    }
  }
}

function buildMii(c: Config, mk: Mk) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  const body = new THREE.Group();
  root.add(rig);
  rig.add(body);
  const sh = new THREE.Mesh(memo("shadow", () => new THREE.CircleGeometry(0.42, 24)), shadowMat);
  sh.rotation.x = -PI / 2;
  sh.position.y = 0.02;
  root.add(sh);

  const legL = mkLeg(rig, mk, 0.12, 0.62, c.pants);
  const legR = mkLeg(rig, mk, -0.12, 0.62, c.pants);
  body.add(mk(cap(0.27, 0.32), c.coatColor, 0, 1.0, 0));
  coatDetails(body, c, mk, 1.0, 0.27, 0.3);
  const aL = mkArm(body, mk, 0.34, 1.3, c.coatColor, c.skin);
  const aR = mkArm(body, mk, -0.34, 1.3, c.coatColor, c.skin);
  body.add(mk(cyl(0.08, 0.09, 0.14), c.skin, 0, 1.47, 0));

  const head = new THREE.Group();
  head.position.y = 1.86;
  body.add(head);
  const egg = mk(sph(0.4), c.skin);
  egg.scale.set(0.92, 1.06, 0.95);
  head.add(egg);
  const brow = c.hairColor === "#ecdcb4" ? "#c79a5b" : c.hairColor;
  for (const s of [-1, 1]) {
    const w = mk(sph(0.07), "#ffffff", s * 0.13, 0.04, 0.35);
    w.scale.set(1, 1.25, 0.4);
    head.add(w);
    head.add(mk(sph(0.04), "#0b1030", s * 0.13, 0.03, 0.38));
    const b = mk(box(0.12, 0.025, 0.02), brow, s * 0.13, 0.16, 0.36);
    b.rotation.z = -s * 0.12;
    head.add(b);
  }
  head.add(mk(sph(0.04), c.skin, 0, -0.06, 0.39));
  const smile = mk(tor(0.07, 0.013, PI), "#0b1030", 0, -0.17, 0.35);
  smile.rotation.z = PI;
  head.add(smile);
  const decor = new THREE.Group();
  decor.scale.setScalar(0.4 / 0.36);
  head.add(decor);
  decorateHead(decor, c, mk);
  scarfAt(body, c, mk, 1.38, 0.24, 0.24);

  return { root, rig, body, head, armL: aL.p, armR: aR.p, legL, legR, handL: aL.hand, handR: aR.hand, headR: 0.4, chestY: 1.0, frontZ: 0.27, backZ: -0.27, torsoR: 0.27, top: 0 };
}

function extras(p: Parts, c: Config, mk: Mk) {
  if (c.extra === "coffee") {
    p.handR.add(mk(cyl(0.075, 0.065, 0.17, 14), "#ffffff", 0, -0.02, 0.1));
    p.handR.add(mk(cyl(0.079, 0.074, 0.06, 14), "#c98d63", 0, -0.02, 0.1));
  }
  if (c.extra === "sketchbook") {
    const b = mk(box(0.24, 0.3, 0.04), "#e2725b", 0, 0, 0.12);
    b.rotation.x = -0.3;
    p.handL.add(b);
  }
  if (c.extra === "camera") {
    p.body.add(mk(box(0.26, 0.16, 0.1), "#1e293b", 0, p.chestY + 0.05, p.frontZ + 0.04));
    const l = mk(cyl(0.05, 0.05, 0.08, 14), "#0b1030", 0, p.chestY + 0.05, p.frontZ + 0.11);
    l.rotation.x = PI / 2;
    p.body.add(l);
  }
}

function costume(p: Parts, k: Config["costume"], mk: Mk) {
  if (k === "none") return;
  const H = new THREE.Group();
  H.scale.setScalar(p.headR / 0.36);
  p.head.add(H);
  const B = p.body, cy = p.chestY, fz = p.frontZ, bz = p.backZ, tr = p.torsoR;
  const put = (parent: THREE.Object3D, m: THREE.Mesh, rx = 0, rz = 0) => {
    m.rotation.x = rx;
    m.rotation.z = rz;
    parent.add(m);
    return m;
  };
  if (k === "santa") {
    put(H, mk(cone(0.34, 0.55), "#c8102e", 0, 0.44, -0.04), -0.35);
    put(H, mk(tor(0.36, 0.07), "#ffffff", 0, 0.22, 0), PI / 2 - 0.15);
    H.add(mk(sph(0.08), "#ffffff", 0, 0.68, -0.14));
    const beard = mk(sph(0.3), "#ffffff", 0, -0.22, 0.18);
    beard.scale.set(1, 0.9, 0.6);
    H.add(beard);
    put(B, mk(tor(tr * 1.03, 0.035), "#1b2340", 0, cy - 0.08, 0), PI / 2);
    B.add(mk(box(0.12, 0.1, 0.03), "#f2c14e", 0, cy - 0.08, fz + 0.03));
  }
  if (k === "elf") {
    put(H, mk(cone(0.3, 0.62), "#2e8b57", 0, 0.46, -0.06), -0.45);
    put(H, mk(tor(0.33, 0.06), "#c8102e", 0, 0.2, 0), PI / 2 - 0.15);
    H.add(mk(sph(0.05), "#f2c14e", 0, 0.7, -0.3));
    for (const s of [-1, 1]) put(H, mk(cone(0.06, 0.22, 6), "#f2b896", s * 0.38, 0.02, 0), 0, -s * 1.2);
  }
  if (k === "reindeer") {
    for (const s of [-1, 1]) {
      put(H, mk(cyl(0.025, 0.035, 0.42, 6), "#6b4a2f", s * 0.18, 0.48, 0), 0, -s * 0.35);
      put(H, mk(cyl(0.02, 0.025, 0.2, 6), "#6b4a2f", s * 0.3, 0.58, 0.03), 0, -s * 1.1);
      put(H, mk(cyl(0.02, 0.025, 0.18, 6), "#6b4a2f", s * 0.2, 0.7, 0), 0, s * 0.25);
      const ear = mk(sph(0.08), "#8a5a3c", s * 0.34, 0.16, 0);
      ear.scale.set(0.5, 1, 0.3);
      H.add(ear);
    }
    H.add(mk(sph(0.07), "#e0312b", 0, -0.03, 0.38));
  }
  if (k === "penguin") {
    put(H, mk(hemi(0.42), "#1e2433", 0, 0, -0.02), -0.15);
    put(H, mk(cone(0.06, 0.16, 4), "#f2a33b", 0, -0.05, 0.4), PI / 2);
    const belly = mk(sph(tr), "#ffffff", 0, cy, fz * 0.5);
    belly.scale.set(0.8, 1, 0.62);
    B.add(belly);
  }
  if (k === "snowman") {
    H.add(mk(cyl(0.24, 0.24, 0.38), "#1b2340", 0, 0.52, 0));
    H.add(mk(cyl(0.38, 0.38, 0.03), "#1b2340", 0, 0.33, 0));
    H.add(mk(cyl(0.245, 0.245, 0.06), "#c8102e", 0, 0.38, 0));
    put(H, mk(cone(0.045, 0.26), "#f08a3c", 0, -0.02, 0.46), PI / 2);
    for (const i of [-1, 0, 1]) B.add(mk(sph(0.035), "#1b2340", 0, cy + i * 0.12, fz + 0.01));
  }
  if (k === "skier") {
    put(H, mk(hemi(0.41), "#e2725b", 0, 0.04, 0), -0.15);
    put(H, mk(tor(0.38, 0.03), "#1b2340", 0, 0.14, 0), PI / 2);
    const lens = new THREE.Mesh(box(0.44, 0.13, 0.08), gloss("#f2a33b"));
    lens.position.set(0, 0.15, 0.35);
    H.add(lens);
    for (const s of [-1, 1]) p.handL.add(mk(box(0.06, 1.2, 0.02), "#e2725b", s * 0.04, 0.25, -0.06));
    p.handR.add(mk(cyl(0.012, 0.012, 0.9, 6), "#1b2340", 0, 0.1, 0.04));
  }
  if (k === "astronaut") {
    H.add(new THREE.Mesh(sph(0.56), glassMat));
    put(H, mk(tor(0.5, 0.05), "#d9dde8", 0, -0.42, 0), PI / 2);
    B.add(mk(box(tr * 1.6, tr * 2, tr * 0.9), "#e8ecf4", 0, cy + 0.05, bz - tr * 0.35));
    B.add(mk(box(0.12, 0.08, 0.02), "#3b5bdb", tr * 0.45, cy + 0.1, fz + 0.01));
  }
  if (k === "wizard") {
    put(H, mk(cone(0.36, 0.78), "#4b2a8a", 0, 0.56, -0.05), -0.2);
    H.add(mk(cyl(0.5, 0.5, 0.03, 24), "#4b2a8a", 0, 0.2, 0));
    for (const [x, y, z] of [[0.1, 0.5, 0.14], [-0.12, 0.66, 0.02], [0.04, 0.8, -0.08]]) H.add(mk(octa(0.045), "#f2c14e", x, y, z));
    put(H, mk(cone(0.2, 0.42), "#f4f4f4", 0, -0.4, 0.22), PI);
    p.handR.add(mk(cyl(0.025, 0.03, 1.4, 8), "#6b4a2f", 0, 0.2, 0.05));
    p.handR.add(mk(octa(0.1), "#93c5fd", 0, 0.95, 0.05));
  }
  if (k === "dino") {
    put(H, mk(hemi(0.43), "#5fa38a", 0, 0.02, -0.02), -0.25);
    for (const s of [-1, 1]) {
      H.add(mk(sph(0.06), "#ffffff", s * 0.15, 0.38, 0.2));
      H.add(mk(sph(0.03), "#0b1030", s * 0.15, 0.4, 0.25));
    }
    for (let i = 0; i < 4; i++) {
      const a = -0.3 - i * 0.45;
      put(H, mk(cone(0.07, 0.18, 4), "#3f7f6a", 0, Math.cos(a) * 0.43, Math.sin(a) * 0.43), a);
    }
    for (let i = 0; i < 3; i++) put(B, mk(cone(0.06, 0.16, 4), "#3f7f6a", 0, cy + 0.12 - i * 0.16, bz - 0.03), -PI / 2);
    put(B, mk(cone(0.15, 0.6, 8), "#5fa38a", 0, cy - 0.28, bz - 0.22), -(PI / 2 + 0.45));
  }
}

export function buildVillager(config: Config): Parts {
  const c = wear(config);
  const mk = maker(soft);
  const p = buildMii(c, mk) as Parts;
  extras(p, c, mk);
  costume(p, config.costume, mk);
  p.root.updateMatrixWorld(true);
  const h = new THREE.Vector3();
  p.head.getWorldPosition(h);
  const tallHat = ["santa", "elf", "wizard", "snowman"].includes(config.costume) ? 0.35 : 0;
  p.top = h.y + p.headR * (1.1 + tallHat * 2.2) + 0.22;
  return p;
}

export const EMOTE_LEN = 2.4;
export type PoseState = { mode: "idle" | "walk" | "emote"; emote: Config["emote"]; et: number };

export function pose(p: Parts, t: number, st: PoseState) {
  p.legL.rotation.x = p.legR.rotation.x = 0;
  p.armL.rotation.set(0, 0, 0.14);
  p.armR.rotation.set(0, 0, -0.14);
  p.rig.position.y = 0;
  p.rig.rotation.set(0, 0, 0);
  p.head.rotation.set(0, 0, 0);
  if (st.mode === "walk") {
    const s = Math.sin(t * 10);
    p.legL.rotation.x = s * 0.7;
    p.legR.rotation.x = -s * 0.7;
    p.armL.rotation.x = -s * 0.6;
    p.armR.rotation.x = s * 0.6;
    p.rig.position.y = Math.abs(Math.cos(t * 10)) * 0.07;
    p.rig.rotation.z = s * 0.04;
    return;
  }
  p.rig.position.y = Math.sin(t * 2.2) * 0.012;
  p.head.rotation.y = Math.sin(t * 0.6) * 0.25;
  p.head.rotation.z = Math.sin(t * 0.9) * 0.04;
  if (st.mode !== "emote") return;
  const e = st.et;
  if (st.emote === "wave") {
    p.armR.rotation.z = -2.6 + Math.sin(e * 12) * 0.35;
    p.head.rotation.z = 0.1;
    p.head.rotation.y = 0;
  }
  if (st.emote === "jump") {
    const h = Math.abs(Math.sin(e * 6));
    p.rig.position.y = h * 0.5;
    p.armL.rotation.z = 0.3 + h * 2.2;
    p.armR.rotation.z = -0.3 - h * 2.2;
    p.legL.rotation.x = p.legR.rotation.x = -h * 0.3;
  }
  if (st.emote === "dance") {
    p.rig.rotation.y = Math.sin(e * 6) * 0.5;
    p.armL.rotation.z = 1.4 + Math.sin(e * 12) * 0.6;
    p.armR.rotation.z = -1.4 + Math.sin(e * 12) * 0.6;
    p.rig.position.y = Math.abs(Math.sin(e * 12)) * 0.08;
    p.head.rotation.z = Math.sin(e * 6) * 0.2;
  }
}

export function addLights(scene: THREE.Scene) {
  // three's physically based lights need roughly π× the old "legacy" intensities
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9fb4e0, 3.3);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 4);
  scene.add(hemi, sun);
  return { hemi, sun };
}

// ---------------------------------------------------------------------------
// Portraits: the default profile picture is the character's head and
// shoulders. One small offscreen renderer, results cached by config.
// ---------------------------------------------------------------------------
let portraitKit: { r: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera } | null = null;
const portraits = new Map<string, string>();

export function portrait(config: Config): string {
  const key = JSON.stringify(config);
  const hit = portraits.get(key);
  if (hit) return hit;
  if (!portraitKit) {
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(192, 192, false);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dbe8ff");
    addLights(scene);
    portraitKit = { r, scene, cam: new THREE.PerspectiveCamera(30, 1, 0.1, 20) };
  }
  const { r, scene, cam } = portraitKit;
  const p = buildVillager(config);
  scene.add(p.root);
  p.root.rotation.y = 0.32;
  pose(p, 0, { mode: "idle", emote: "wave", et: 0 });
  p.head.rotation.set(0, 0, 0);
  p.root.updateMatrixWorld(true);
  const h = new THREE.Vector3();
  p.head.getWorldPosition(h);
  const d = 2.3 * (p.headR / 0.36);
  cam.position.set(h.x + d * 0.17, h.y + 0.02, h.z + d);
  cam.lookAt(h.x, h.y - 0.08, h.z);
  r.render(scene, cam);
  scene.remove(p.root);
  const url = r.domElement.toDataURL("image/png");
  portraits.set(key, url);
  return url;
}
