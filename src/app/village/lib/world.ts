// ---------------------------------------------------------------------------
// The village itself: a three.js scene of a round alpine village (cabins in
// two rings around a big christmas tree), villagers who wander near their
// homes, and a visitor you walk around with the keyboard or the mouse.
// React owns the UI around it (card, directory, hud); this class owns the
// canvas, the minimap canvas, the floating bubble's position and the few name
// labels ("you", and new arrivals on the big screen). It reports what the UI
// needs through callbacks.
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { EMOTE_LEN, buildVillager, box, cone, cyl, gradientMap, octa, pose, sph, type Parts, type PoseState } from "./characters";
import { VISITOR, mulberry, type Villager } from "./villager";

const PI = Math.PI;
const V3 = THREE.Vector3;
const VILLAGE_R = 20.5;
const FENCE_R = 21.5;
const CAM_NEAR = new V3(0, 7.2, 10.5);
const CAM_FAR = new V3(0, 42, 15);
const MAP_WORLD = 22.5;

export type Mode = "explore" | "projector";

const THEMES = {
  day: { bg: "#cfe0f8", near: 30, far: 85, ground: "#f6f9ff", path: "#e2ebfb", hill: "#e9f1ff", tree: "#1f3c8f", cap: "#ffffff", trunk: "#6b5240", wall: "#3b5bdb", roof: "#ffffff", door: "#021093", window: "#bcd3f5", pond: "#a6c8f2", post: "#021093", glow: "#e8f0ff", hemiSky: 0xffffff, hemiGround: 0xa8bde6, hemi: 3.3, sun: 2.3, sunColor: 0xffffff, lamp: 0, snow: "#ffffff" },
  night: { bg: "#040c2a", near: 22, far: 70, ground: "#22346c", path: "#2d4282", hill: "#1b2b5e", tree: "#0d1c55", cap: "#b9cbf5", trunk: "#2a2140", wall: "#1d2f7c", roof: "#c3d3fa", door: "#0a1238", window: "#ffd27a", pond: "#1a3577", post: "#0a1238", glow: "#ffd27a", hemiSky: 0x7d93de, hemiGround: 0x0b1440, hemi: 1.7, sun: 0.95, sunColor: 0x9fb6ff, lamp: 6, snow: "#dbe6ff" },
};
type WorldMat = "ground" | "path" | "hill" | "tree" | "cap" | "trunk" | "wall" | "roof" | "door" | "pond" | "post";
const WORLD_MATS: WorldMat[] = ["ground", "path", "hill", "tree", "cap", "trunk", "wall", "roof", "door", "pond", "post"];

/* ---------- layout: cabins in two rings, three villagers per cabin ---------- */
const SLOTS: THREE.Vector3[] = [];
for (let i = 0; i < 6; i++) { const a = PI / 6 + (i * PI) / 3; SLOTS.push(new V3(Math.sin(a) * 10, 0, Math.cos(a) * 10)); }
for (let i = 0; i < 12; i++) { const a = PI / 12 + (i * PI) / 6; SLOTS.push(new V3(Math.sin(a) * 16.5, 0, Math.cos(a) * 16.5)); }
const POND = new V3(0, 0, -10.5);

type Actor = {
  data: Villager;
  parts: Parts;
  root: THREE.Group;
  state: PoseState;
  phase: number;
  home: THREE.Vector3;
  target: THREE.Vector3 | null;
  timer: number;
  talking: boolean;
  met: boolean;
  isNew: boolean;
};

export type VillageEvents = {
  onBubble: (v: Villager | null, met: boolean) => void;
  onCard: (v: Villager | null) => void;
  onProgress: (met: number, total: number) => void;
  onArrival: (v: Villager) => void;
  onAllMet: () => void;
  onFirstFrame: () => void;
};
export type VillageEls = { canvas: HTMLCanvasElement; minimap: HTMLCanvasElement | null; bubble: HTMLElement; labels: HTMLElement };

export class Village {
  private r: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
  private look = new V3(0, 1, 0);
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private W = {} as Record<WorldMat, THREE.MeshToonMaterial> & { window: THREE.MeshBasicMaterial; glow: THREE.MeshBasicMaterial };
  private lamps: THREE.PointLight[] = [];
  private stars: THREE.Mesh[] = [];
  private cabins: THREE.Group[] = [];
  private snow: THREE.Points;
  private snowMat: THREE.PointsMaterial;
  private puffs: { p: THREE.Points; vel: number[][]; life: number }[] = [];
  private marker: THREE.Mesh;
  private ground: THREE.Mesh;
  private player: Actor;
  private playerLabel: HTMLElement;
  private villagers: Actor[] = [];
  private labels = new Map<string, HTMLElement>();
  private keys: Record<string, boolean> = {};
  private path: THREE.Vector3[] = [];
  private stuck = 0;
  private pendingHi: Actor | null = null;
  private card: Actor | null = null;
  private near: Actor | null = null;
  private hover: Actor | null = null;
  private bubbleFor: Actor | null = null;
  private pointer: { x: number; y: number } | null = null;
  private lastRay = 0;
  private zoom = 0;
  private zoomT = 0;
  private orbit = 0;
  private focus: { actor: Actor; until: number } | null = null;
  private w = 1;
  private h = 1;
  private raf = 0;
  private last = 0;
  private firstFrame = false;
  private reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private tmp = new V3();
  private v3 = new V3();
  private resizeObs: ResizeObserver;
  private cleanup: (() => void)[] = [];
  // Input is ignored while an overlay (onboarding, directory) is open.
  inputEnabled = true;
  mode: Mode;
  night = false;

  constructor(private els: VillageEls, private ev: VillageEvents, opts: { mode: Mode; night: boolean }) {
    this.mode = opts.mode;
    this.r = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.fog = new THREE.Fog(0xffffff, 20, 60);
    this.cam.position.set(0, 9, 17);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xa8bde6, 3);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.position.set(8, 15, 6);
    this.scene.add(this.hemi, this.sun);
    for (const k of WORLD_MATS) this.W[k] = new THREE.MeshToonMaterial({ gradientMap });
    this.W.window = new THREE.MeshBasicMaterial();
    this.W.glow = new THREE.MeshBasicMaterial();

    this.ground = new THREE.Mesh(new THREE.CircleGeometry(95, 72), this.W.ground);
    this.ground.rotation.x = -PI / 2;
    this.scene.add(this.ground);
    const r = mulberry(42);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2 + r(), d = 46 + r() * 10;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.W.hill);
      hill.position.set(Math.sin(a) * d, -1, Math.cos(a) * d);
      hill.scale.set(6 + r() * 5, 3 + r() * 3, 6 + r() * 5);
      this.scene.add(hill);
    }
    const village = new THREE.Group();
    this.scene.add(village);
    this.buildAlpine(village);
    while (this.cabins.length < SLOTS.length) {
      const s = SLOTS[this.cabins.length], c = this.makeCabin();
      c.position.copy(s);
      c.rotation.y = Math.atan2(-s.x, -s.z);
      village.add(c);
      this.cabins.push(c);
    }

    const N = 1400, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 64;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 64;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, map: dotTexture(), transparent: true, opacity: 0.95, depthWrite: false });
    this.snow = new THREE.Points(sg, this.snowMat);
    this.scene.add(this.snow);
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 28), new THREE.MeshBasicMaterial({ color: 0x3b5bdb, transparent: true, opacity: 0, depthWrite: false }));
    this.marker.rotation.x = -PI / 2;
    this.marker.position.y = 0.03;
    this.scene.add(this.marker);

    this.player = this.makeActor({ id: "you", name: "you", config: VISITOR } as Villager);
    this.playerLabel = this.label("you", true);

    this.setNight(opts.night);
    this.updateCabins();
    this.player.root.position.set(0, 0, 4.5);
    this.player.root.rotation.y = PI;
    this.cam.position.copy(this.player.root.position).add(CAM_NEAR);
    this.look.copy(this.player.root.position).setY(1);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(els.canvas);
    this.resize();
    this.bindInput();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------------- public api ---------------- */
  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.cleanup.forEach((f) => f());
    this.labels.forEach((l) => l.remove());
    this.playerLabel.remove();
    this.r.dispose();
  }

  setVillagers(list: Villager[], announce: boolean) {
    const byId = new Map(list.map((v) => [v.id, v]));
    for (const a of [...this.villagers]) if (!byId.has(a.data.id)) this.removeActor(a);
    for (const v of list) {
      const a = this.villagers.find((x) => x.data.id === v.id);
      if (!a) this.addVillager(v, announce);
      else if (a.data.updatedAt !== v.updatedAt) this.replaceVillager(a, v);
    }
    this.progress();
  }

  setNight(n: boolean) {
    this.night = n;
    const T = THEMES[n ? "night" : "day"];
    this.scene.background = new THREE.Color(T.bg);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(T.bg);
    fog.near = T.near;
    fog.far = T.far;
    for (const k of WORLD_MATS) this.W[k].color.set(T[k]);
    this.W.window.color.set(T.window);
    this.W.glow.color.set(T.glow);
    this.hemi.color.setHex(T.hemiSky);
    this.hemi.groundColor.setHex(T.hemiGround);
    this.hemi.intensity = T.hemi;
    this.sun.intensity = T.sun;
    this.sun.color.setHex(T.sunColor);
    this.lamps.forEach((l) => (l.intensity = T.lamp));
    this.snowMat.color.set(T.snow);
  }

  setMode(m: Mode) {
    this.mode = m;
    if (m === "projector") {
      this.closeCard();
    } else this.cam.position.copy(this.player.root.position).add(CAM_NEAR);
  }

  setZoom(z: number) {
    this.zoomT = Math.min(1, Math.max(0, z));
  }
  get zoomed() {
    return this.zoomT > 0.5;
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
    const p = this.player.root.position;
    let best: Actor | null = null, bd = Infinity;
    for (const v of this.villagers) {
      if (v.met || v === this.card) continue;
      const d = v.root.position.distanceTo(p);
      if (d < bd) { bd = d; best = v; }
    }
    if (!best) return false;
    this.closeCard();
    this.walkTo(best);
    return true;
  }

  // Jump next to someone and say hi (from the directory, or ?me= after joining).
  visit(id: string) {
    const v = this.villagers.find((x) => x.data.id === id);
    if (!v) return false;
    const p = this.player.root.position;
    let spot: THREE.Vector3 | null = null;
    for (let i = 0; i < 8 && !spot; i++) {
      const a = (i / 8) * PI * 2, c = v.root.position.clone().add(new V3(Math.sin(a) * 1.7, 0, Math.cos(a) * 1.7));
      if (!this.blocked(c)) spot = c;
    }
    p.copy(spot ?? v.root.position);
    this.zoomT = this.zoom = 0;
    this.cam.position.copy(p).add(CAM_NEAR);
    this.look.copy(p).setY(1);
    this.path = [];
    this.sayHi(v);
    return true;
  }

  talkToBubble() {
    if (this.bubbleFor) this.talkOrWalk(this.bubbleFor);
  }

  /* ---------------- villagers ---------------- */
  private makeActor(data: Villager): Actor {
    const parts = buildVillager(data.config);
    parts.root.traverse((o) => (o.userData.vid = data.id));
    this.scene.add(parts.root);
    return { data, parts, root: parts.root, state: { mode: "idle", emote: data.config.emote, et: 0 }, phase: Math.random() * 10, home: new V3(), target: null, timer: Math.random() * 3, talking: false, met: false, isNew: false };
  }
  private label(text: string, you = false) {
    const el = document.createElement("div");
    el.className = "village-label" + (you ? " is-you" : "");
    el.textContent = text;
    el.style.display = "none";
    this.els.labels.append(el);
    return el;
  }
  private addVillager(v: Villager, announce: boolean) {
    const a = this.makeActor(v);
    a.home = this.homeFor(this.villagers.length);
    a.root.position.copy(a.home);
    a.root.rotation.y = Math.random() * 6;
    this.villagers.push(a);
    this.updateCabins(announce);
    if (announce) {
      a.isNew = true;
      const l = this.label(v.name);
      this.labels.set(v.id, l);
      setTimeout(() => {
        a.isNew = false;
        l.remove();
        this.labels.delete(v.id);
      }, 9000);
      this.puff(a.home.clone().setY(0.6), 45);
      a.state = { mode: "emote", emote: "jump", et: 0 };
      this.focus = { actor: a, until: performance.now() / 1000 + 6 };
      this.ev.onArrival(v);
    }
  }
  private replaceVillager(a: Actor, v: Villager) {
    const pos = a.root.position.clone(), ry = a.root.rotation.y;
    this.scene.remove(a.root);
    a.data = v;
    a.parts = buildVillager(v.config);
    a.root = a.parts.root;
    a.root.traverse((o) => (o.userData.vid = v.id));
    a.root.position.copy(pos);
    a.root.rotation.y = ry;
    this.scene.add(a.root);
    this.puff(pos.clone().setY(0.6), 30);
    a.state = { mode: "emote", emote: v.config.emote, et: 0 };
    if (this.card === a) this.ev.onCard(v);
  }
  private removeActor(a: Actor) {
    this.scene.remove(a.root);
    this.villagers.splice(this.villagers.indexOf(a), 1);
    if (this.card === a) this.closeCard();
    this.labels.get(a.data.id)?.remove();
    this.villagers.forEach((v, i) => (v.home = this.homeFor(i)));
  }
  private homeFor(i: number) {
    // past the last cabin, people stand a step further out from the same ones
    const s = SLOTS[Math.floor(i / 3) % SLOTS.length], lap = Math.floor(i / (SLOTS.length * 3));
    const toC = s.clone().negate().normalize(), perp = new V3(toC.z, 0, -toC.x);
    return s.clone().addScaledVector(toC, 2.3 + lap * 1.2).addScaledVector(perp, ((i % 3) - 1) * 1.15);
  }
  private updateCabins(announce = false) {
    const need = Math.max(4, Math.ceil(this.villagers.length / 3));
    this.cabins.forEach((c, k) => {
      const show = k < need;
      if (show && !c.visible && announce) this.puff(c.position.clone().setY(1), 60);
      c.visible = show;
    });
  }
  private progress() {
    this.ev.onProgress(this.villagers.filter((v) => v.met).length, this.villagers.length);
  }

  /* ---------------- moving around ---------------- */
  private blocked(p: THREE.Vector3) {
    return p.x * p.x + p.z * p.z > VILLAGE_R * VILLAGE_R;
  }
  private tryMove(pos: THREE.Vector3, dx: number, dz: number) {
    const ox = pos.x, oz = pos.z;
    pos.x = ox + dx; pos.z = oz + dz;
    if (!this.blocked(pos)) return;
    pos.z = oz;
    if (!this.blocked(pos)) return;
    pos.x = ox; pos.z = oz + dz;
    if (!this.blocked(pos)) return;
    pos.x = ox; pos.z = oz;
  }
  private setGoal(target: THREE.Vector3, hi: Actor | null = null) {
    target = target.clone().setY(0);
    if (target.length() > VILLAGE_R) target.setLength(VILLAGE_R);
    const pts: THREE.Vector3[] = [];
    pts.push(target);
    this.path = pts;
    this.pendingHi = hi;
    this.stuck = 0;
    this.marker.position.set(target.x, 0.03, target.z);
  }
  private walkTo(v: Actor) {
    const pp = this.player.root.position;
    let best: THREE.Vector3 | null = null, bd = Infinity;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2, c = v.root.position.clone().add(new V3(Math.sin(a) * 1.6, 0, Math.cos(a) * 1.6));
      if (this.blocked(c)) continue;
      const d = c.distanceTo(pp);
      if (d < bd) { bd = d; best = c; }
    }
    this.setGoal(best ?? v.root.position.clone(), v);
    if (this.zoomT > 0.5) this.zoomT = 0;
  }
  private talkOrWalk(v: Actor) {
    if (v.root.position.distanceTo(this.player.root.position) < 2.8) this.sayHi(v);
    else this.walkTo(v);
  }
  private sayHi(v: Actor) {
    if (this.card && this.card !== v) this.card.talking = false;
    this.card = v;
    v.talking = true;
    v.target = null;
    v.state = { mode: "emote", emote: v.data.config.emote, et: 0 };
    this.player.state = { mode: "emote", emote: "wave", et: 0 };
    this.pendingHi = null;
    if (!v.met) {
      v.met = true;
      this.progress();
      if (this.villagers.every((x) => x.met)) this.ev.onAllMet();
    }
    this.ev.onCard(v.data);
  }

  /* ---------------- input ---------------- */
  private pick(clientX: number, clientY: number) {
    const r = this.els.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.cam);
    const hit = this.ray.intersectObjects(this.villagers.map((v) => v.root), true)[0];
    if (hit) return { v: this.villagers.find((x) => x.data.id === hit.object.userData.vid) ?? null, ground: null };
    return { v: null, ground: this.ray.intersectObject(this.ground)[0] ?? null };
  }
  private bindInput() {
    const canvas = this.els.canvas;
    const on = <K extends keyof WindowEventMap>(t: EventTarget, type: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
      t.addEventListener(type, f as EventListener, o);
      this.cleanup.push(() => t.removeEventListener(type, f as EventListener, o));
    };
    on(canvas, "click", (e) => {
      if (this.mode !== "explore" || !this.inputEnabled) return;
      const { v, ground } = this.pick(e.clientX, e.clientY);
      if (v) return this.talkOrWalk(v);
      if (ground) this.setGoal(ground.point);
      canvas.focus({ preventScroll: true });
    });
    on(canvas, "pointermove", (e) => {
      if (e.pointerType === "mouse") this.pointer = { x: e.clientX, y: e.clientY };
    });
    on(canvas, "pointerleave", () => {
      this.pointer = null;
      this.hover = null;
      canvas.style.cursor = "";
    });
    on(canvas, "wheel", (e) => {
      if (this.mode !== "explore") return;
      e.preventDefault();
      this.zoomT = Math.min(1, Math.max(0, this.zoomT + e.deltaY * 0.0015));
    }, { passive: false });
    const mm = this.els.minimap;
    if (mm)
      on(mm, "click", (e) => {
        const r = mm.getBoundingClientRect(), k = (r.width / 2 - (6 * r.width) / mm.width) / MAP_WORLD;
        const pt = new V3((e.clientX - r.left - r.width / 2) / k, 0, (e.clientY - r.top - r.height / 2) / k);
        const hit = this.villagers.find((v) => v.root.position.distanceTo(pt) < 1.6);
        if (hit) {
          this.closeCard();
          this.walkTo(hit);
        } else this.setGoal(pt);
      });
    const keyOf = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    on(window, "keydown", (e) => {
      if (this.mode !== "explore" || !this.inputEnabled) return;
      const t = e.target as HTMLElement;
      if (/^(input|textarea|select)$/i.test(t.tagName)) return;
      const key = keyOf(e);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key)) {
        this.keys[key] = true;
        e.preventDefault();
        if (this.zoomT > 0.5) this.zoomT = 0;
      }
      if (key === "Enter" && t.tagName !== "BUTTON" && t.tagName !== "A") {
        const v = this.near ?? this.bubbleFor;
        if (v) {
          e.preventDefault();
          this.talkOrWalk(v);
        }
      }
      if (key === "m") this.zoomT = this.zoomT > 0.5 ? 0 : 1;
    });
    on(window, "keyup", (e) => (this.keys[keyOf(e)] = false));
    on(window, "blur", () => (this.keys = {}));
  }

  /* ---------------- frame ---------------- */
  private resize() {
    const w = this.els.canvas.clientWidth, h = this.els.canvas.clientHeight;
    if (!w || !h) return;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.w = w;
    this.h = h;
  }
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(now / 1000, dt);
    this.r.render(this.scene, this.cam);
    if (this.mode === "explore") this.drawMinimap();
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.ev.onFirstFrame();
    }
  };
  private lerpAngle(a: number, b: number, k: number) {
    let d = ((b - a + PI) % (PI * 2)) - PI;
    if (d < -PI) d += PI * 2;
    return a + d * k;
  }
  private face(a: Actor, p: THREE.Vector3, dt: number) {
    this.tmp.subVectors(p, a.root.position);
    a.root.rotation.y = this.lerpAngle(a.root.rotation.y, Math.atan2(this.tmp.x, this.tmp.z), 1 - Math.exp(-dt * 8));
  }
  private step(a: Actor, target: THREE.Vector3, speed: number, dt: number, collide: boolean) {
    const tmp = this.tmp.subVectors(target, a.root.position).setY(0);
    const d = tmp.length();
    if (d < 0.1) return "arrived";
    tmp.normalize();
    const s = Math.min(d, speed * dt), bx = a.root.position.x, bz = a.root.position.z;
    if (collide) this.tryMove(a.root.position, tmp.x * s, tmp.z * s);
    else a.root.position.addScaledVector(tmp, s);
    a.root.rotation.y = this.lerpAngle(a.root.rotation.y, Math.atan2(tmp.x, tmp.z), 1 - Math.exp(-dt * 10));
    if (collide && Math.hypot(a.root.position.x - bx, a.root.position.z - bz) < s * 0.3) {
      this.stuck += dt;
      if (this.stuck > 0.5) return "stuck";
    } else this.stuck = 0;
    return "moving";
  }
  private screenOf(pos: THREE.Vector3, yOff: number) {
    const v = this.v3.copy(pos);
    v.y += yOff;
    v.project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, ok: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 };
  }

  private update(t: number, dt: number) {
    const explore = this.mode === "explore";
    this.player.root.visible = explore;
    for (const v of this.villagers) {
      v.state.et += dt;
      if (v.talking) {
        this.face(v, this.player.root.position, dt);
        if (v.state.mode === "emote" && v.state.et > EMOTE_LEN) v.state = { mode: "idle", emote: v.data.config.emote, et: 0 };
      } else if (v.state.mode === "emote") {
        if (v.state.et > EMOTE_LEN) {
          v.state = { mode: "idle", emote: v.data.config.emote, et: 0 };
          v.timer = 1 + Math.random() * 2;
        }
      } else if (v.target) {
        v.state.mode = "walk";
        if (this.step(v, v.target, 1.1, dt, false) === "arrived") {
          v.target = null;
          v.state.mode = "idle";
          v.timer = 2 + Math.random() * 5;
        }
      } else {
        v.timer -= dt;
        if (v.timer <= 0) {
          const a = Math.random() * PI * 2, d = Math.random() * 2.6;
          const tg = v.home.clone().add(new V3(Math.cos(a) * d, 0, Math.sin(a) * d));
          if (!this.blocked(tg)) v.target = tg;
          else v.timer = 1;
        }
      }
      if ((v === this.hover || v === this.pendingHi) && v.state.mode === "walk") {
        v.target = null;
        v.state.mode = "idle";
        v.timer = 3;
      }
      pose(v.parts, t + v.phase, v.state);
    }

    let bubbleFor: Actor | null = null;
    if (explore) {
      const p = this.player, k = this.keys, tmp = this.tmp;
      const ix = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0);
      const iz = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0);
      let moving = false;
      if (ix || iz) {
        this.path = [];
        this.pendingHi = null;
        tmp.set(ix, 0, iz).normalize();
        p.root.rotation.y = this.lerpAngle(p.root.rotation.y, Math.atan2(tmp.x, tmp.z), 1 - Math.exp(-dt * 12));
        this.tryMove(p.root.position, tmp.x * 4.4 * dt, tmp.z * 4.4 * dt);
        moving = true;
      } else if (this.path.length) {
        const res = this.step(p, this.path[0], 4.8, dt, true);
        moving = res === "moving";
        if (res === "arrived") {
          this.path.shift();
          moving = this.path.length > 0;
          if (!this.path.length && this.pendingHi) this.sayHi(this.pendingHi);
        }
        if (res === "stuck") {
          this.path = [];
          if (this.pendingHi && this.pendingHi.root.position.distanceTo(p.root.position) < 3.2) this.sayHi(this.pendingHi);
          this.pendingHi = null;
        }
      }
      p.state.et += dt;
      if (p.state.mode === "emote" && p.state.et > EMOTE_LEN) p.state = { mode: "idle", emote: "wave", et: 0 };
      if (this.card && !moving) this.face(p, this.card.root.position, dt);
      pose(p.parts, t, moving ? { mode: "walk", emote: "wave", et: 0 } : p.state);

      this.zoom += (this.zoomT - this.zoom) * (1 - Math.exp(-dt * 4));
      const off = new V3().lerpVectors(CAM_NEAR, CAM_FAR, this.zoom);
      const anchor = p.root.position.clone().multiplyScalar(1 - this.zoom * 0.85);
      this.cam.position.lerp(anchor.clone().add(off), 1 - Math.exp(-dt * 4));
      this.look.lerp(anchor.setY(1), 1 - Math.exp(-dt * 6));
      this.cam.lookAt(this.look);

      let near: Actor | null = null, nd = 2.6;
      for (const v of this.villagers) {
        const d = v.root.position.distanceTo(p.root.position);
        if (d < nd) { nd = d; near = v; }
      }
      this.near = near;
      const now = performance.now();
      if (this.pointer && now - this.lastRay > 90 && this.inputEnabled) {
        this.lastRay = now;
        this.hover = this.pick(this.pointer.x, this.pointer.y).v;
        this.els.canvas.style.cursor = this.hover ? "pointer" : "";
      }
      bubbleFor = this.hover ?? near;
      if (bubbleFor && bubbleFor === this.card) bubbleFor = null;
      if (this.card && this.card.root.position.distanceTo(p.root.position) > 5.5) this.closeCard();
      const mm = this.marker.material as THREE.MeshBasicMaterial;
      mm.opacity = this.path.length ? 0.7 : Math.max(0, mm.opacity - dt * 2);
    } else {
      const now = performance.now() / 1000;
      if (this.focus && this.focus.until > now) {
        const a = this.focus.actor.root.position;
        const out = a.clone().setY(0).normalize();
        this.cam.position.lerp(a.clone().addScaledVector(out, 7).add(new V3(0, 4.5, 0)), 1 - Math.exp(-dt * 1.8));
        this.look.lerp(a.clone().setY(1.1), 1 - Math.exp(-dt * 2.5));
      } else {
        this.focus = null;
        if (!this.reduced) this.orbit += dt * 0.07;
        this.cam.position.lerp(new V3(Math.sin(this.orbit) * 26, 16, Math.cos(this.orbit) * 26), 1 - Math.exp(-dt * 0.9));
        this.look.lerp(new V3(0, 1, 0), 1 - Math.exp(-dt * 1.2));
      }
      this.cam.lookAt(this.look);
    }

    if (!this.reduced) {
      const a = this.snow.geometry.attributes.position as THREE.BufferAttribute, arr = a.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= (1 + (i % 7) * 0.12) * dt;
        arr[i] += Math.sin(t * 0.8 + i) * 0.004;
        if (arr[i + 1] < 0) arr[i + 1] = 22;
      }
      a.needsUpdate = true;
    }
    for (const s of this.stars) s.rotation.y += dt;
    for (let j = this.puffs.length - 1; j >= 0; j--) {
      const f = this.puffs[j];
      f.life += dt;
      const a = f.p.geometry.attributes.position as THREE.BufferAttribute, arr = a.array as Float32Array;
      f.vel.forEach((v, i) => {
        v[1] -= 4 * dt;
        arr[i * 3] += v[0] * dt;
        arr[i * 3 + 1] = Math.max(0.05, arr[i * 3 + 1] + v[1] * dt);
        arr[i * 3 + 2] += v[2] * dt;
      });
      a.needsUpdate = true;
      (f.p.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - f.life);
      if (f.life > 1) {
        this.scene.remove(f.p);
        f.p.geometry.dispose();
        (f.p.material as THREE.Material).dispose();
        this.puffs.splice(j, 1);
      }
    }

    // labels: only "you", and new arrivals on the big screen
    const place = (el: HTMLElement, a: Actor, show: boolean) => {
      const s = this.screenOf(a.root.position, a.parts.top);
      if (!show || !s.ok) return void (el.style.display = "none");
      el.style.display = "";
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
    };
    place(this.playerLabel, this.player, explore);
    for (const v of this.villagers) {
      const l = this.labels.get(v.data.id);
      if (l) place(l, v, !explore && v.isNew);
    }

    // the bubble (its content is React's; its position is ours)
    if (bubbleFor !== this.bubbleFor) {
      this.bubbleFor = bubbleFor;
      this.ev.onBubble(bubbleFor?.data ?? null, !!bubbleFor?.met);
    }
    const b = this.els.bubble;
    if (bubbleFor) {
      const s = this.screenOf(bubbleFor.root.position, bubbleFor.parts.top + 0.1);
      b.style.visibility = s.ok ? "visible" : "hidden";
      b.style.transform = `translate(${s.x}px, ${s.y - 10}px) translate(-50%, -100%)`;
    }
  }

  private drawMinimap() {
    const c = this.els.minimap;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const S = c.width, R = S / 2 - 6, k = R / MAP_WORLD, cx = S / 2;
    const fg = this.night ? "#93c5fd" : "#021093";
    const soft = this.night ? "rgba(147,197,253,.22)" : "rgba(2,16,147,.12)";
    const ground = this.night ? "#1b2a5c" : "#f4f8ff";
    const water = this.night ? "#2b4a8a" : "#a6c8f2";
    const X = (x: number) => cx + x * k, Y = (z: number) => cx + z * k;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cx, R, 0, 7);
    ctx.fillStyle = ground;
    ctx.fill();
    ctx.clip();
    {
      ctx.strokeStyle = soft;
      ctx.lineWidth = 9;
      for (const rr of [7.75, 14.15]) {
        ctx.beginPath();
        ctx.arc(cx, cx, rr * k, 0, 7);
        ctx.stroke();
      }
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.arc(X(POND.x), Y(POND.z), 2.6 * k, 0, 7);
      ctx.fill();
      ctx.fillStyle = soft;
      for (const cb of this.cabins) {
        if (!cb.visible) continue;
        ctx.save();
        ctx.translate(X(cb.position.x), Y(cb.position.z));
        ctx.rotate(-cb.rotation.y);
        ctx.fillRect(-1.2 * k, -1 * k, 2.4 * k, 2 * k);
        ctx.restore();
      }
      star(ctx, cx, cx, this.night ? "#ffd27a" : "#3b5bdb");
    }
    ctx.restore();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = fg;
    ctx.beginPath();
    ctx.arc(cx, cx, FENCE_R * k, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const v of this.villagers) {
      const x = X(v.root.position.x), y = Y(v.root.position.z);
      if (v === this.bubbleFor || v === this.card || v === this.pendingHi) {
        ctx.strokeStyle = fg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, 7);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, 7);
      if (v.met) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = fg;
        ctx.fillStyle = ground;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = fg;
        ctx.fill();
      }
    }
    const p = this.player.root.position;
    ctx.save();
    ctx.translate(X(p.x), Y(p.z));
    ctx.rotate(-this.player.root.rotation.y + PI);
    ctx.fillStyle = "#e2725b";
    ctx.strokeStyle = ground;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  private puff(at: THREE.Vector3, n: number) {
    const pos = new Float32Array(n * 3), vel: number[][] = [];
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y, at.z], i * 3);
      const a = Math.random() * PI * 2, s = 1 + Math.random() * 2.2;
      vel.push([Math.cos(a) * s, 1 + Math.random() * 2.5, Math.sin(a) * s]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 1, depthWrite: false }));
    this.scene.add(p);
    this.puffs.push({ p, vel, life: 0 });
  }

  /* ---------------- scenery ---------------- */
  private makeTree(s: number) {
    const W = this.W, g = new THREE.Group();
    const trunk = new THREE.Mesh(cyl(0.14, 0.2, 0.6, 8), W.trunk);
    trunk.position.y = 0.3;
    g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const r = 1.1 - i * 0.3, y = 0.95 + i * 0.6;
      const c = new THREE.Mesh(cone(r, 1.1, 9), W.tree);
      c.position.y = y;
      g.add(c);
      const cp = new THREE.Mesh(cone(r * 0.5, 0.5, 9), W.cap);
      cp.position.y = y + 0.32;
      g.add(cp);
    }
    g.scale.setScalar(s);
    return g;
  }
  private makeCabin() {
    const W = this.W, g = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      g.add(mesh);
      return mesh;
    };
    add(box(2.4, 1.6, 2), W.wall, 0, 0.8, 0);
    add(roofGeo(), W.roof, 0, 2.25, 0).scale.set(1.95, 1, 1.65);
    add(box(0.5, 0.9, 0.06), W.door, 0, 0.45, 1.01);
    for (const x of [-0.75, 0.75]) add(box(0.45, 0.4, 0.06), W.window, x, 0.95, 1.01);
    add(box(0.3, 0.7, 0.3), W.wall, 0.6, 2.45, -0.35);
    return g;
  }
  private makeLamp(g: THREE.Group, x: number, z: number, light: boolean) {
    const post = new THREE.Mesh(cyl(0.06, 0.08, 2.2, 8), this.W.post);
    post.position.set(x, 1.1, z);
    const head = new THREE.Mesh(sph(0.2), this.W.glow);
    head.position.set(x, 2.3, z);
    g.add(post, head);
    if (light) {
      const pl = new THREE.PointLight(0xffd27a, 0, 9, 1.6);
      pl.position.set(x, 2.2, z);
      g.add(pl);
      this.lamps.push(pl);
    }
  }
  private makeFence(g: THREE.Group, skip: (x: number, z: number) => boolean) {
    const W = this.W, n = 96, pts: [number, number][] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; pts.push([Math.sin(a) * FENCE_R, Math.cos(a) * FENCE_R]); }
    pts.forEach(([x, z], i) => {
      if (skip(x, z)) return;
      const p = new THREE.Mesh(box(0.14, 0.9, 0.14), W.trunk);
      p.position.set(x, 0.45, z);
      const c = new THREE.Mesh(box(0.18, 0.08, 0.18), W.cap);
      c.position.set(x, 0.93, z);
      g.add(p, c);
      const [nx, nz] = pts[(i + 1) % n];
      if (skip(nx, nz)) return;
      const len = Math.hypot(nx - x, nz - z);
      for (const y of [0.38, 0.66]) {
        const r = new THREE.Mesh(box(0.06, 0.07, len), W.trunk);
        r.position.set((x + nx) / 2, y, (z + nz) / 2);
        r.rotation.y = Math.atan2(nx - x, nz - z);
        g.add(r);
      }
    });
  }
  private forest(g: THREE.Group, seed: number, ok: (p: THREE.Vector3) => boolean) {
    const r = mulberry(seed);
    let placed = 0, tries = 0;
    while (placed < 100 && tries++ < 4000) {
      const a = r() * PI * 2, d = 23.5 + r() * 20, p = new V3(Math.sin(a) * d, 0, Math.cos(a) * d);
      if (!ok(p)) continue;
      const t = this.makeTree(0.8 + r() * 0.9);
      t.position.copy(p);
      t.rotation.y = r() * 6;
      g.add(t);
      placed++;
    }
  }
  private lightString(g: THREE.Group, pts: number[][]) {
    const pal = ["#ffd27a", "#93c5fd", "#ffffff"].map((c) => new THREE.Color(c)), pos: number[] = [], col: number[] = [];
    pts.forEach(([x, y, z], i) => {
      pos.push(x, y, z);
      const c = pal[i % 3];
      col.push(c.r, c.g, c.b);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.28, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false })));
  }
  private christmasTree(g: THREE.Group, x: number, z: number, s: number) {
    const tree = this.makeTree(s);
    tree.position.set(x, 0, z);
    g.add(tree);
    const lights: number[][] = [];
    for (let i = 0; i < 36; i++) {
      const t = i / 36, rad = (1.1 - t * 0.75) * s * 0.95, a = t * PI * 7;
      lights.push([x + Math.sin(a) * rad, 0.75 * s + t * 2.05 * s, z + Math.cos(a) * rad]);
    }
    this.lightString(g, lights);
    const star = new THREE.Mesh(octa(0.16 * s), new THREE.MeshBasicMaterial({ color: "#ffd27a" }));
    star.position.set(x, 3.02 * s, z);
    g.add(star);
    this.stars.push(star);
  }

  private buildAlpine(g: THREE.Group) {
    const W = this.W;
    for (const [a, b] of [[7.2, 8.3], [13.6, 14.7]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(a, b, 96), W.path);
      ring.rotation.x = -PI / 2;
      ring.position.y = 0.01;
      g.add(ring);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i * PI) / 3, sp = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 6.3), W.path);
      sp.rotation.x = -PI / 2;
      sp.rotation.z = -a;
      sp.position.set(Math.sin(a) * 11.2, 0.011, Math.cos(a) * 11.2);
      g.add(sp);
    }
    this.makeFence(g, () => false);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), W.pond);
    pond.rotation.x = -PI / 2;
    pond.position.copy(POND).setY(0.02);
    g.add(pond);
    this.christmasTree(g, 0, 0, 2.1);
    for (let i = 0; i < 6; i++) { const a = PI / 6 + (i * PI) / 3; this.makeLamp(g, Math.sin(a) * 5.6, Math.cos(a) * 5.6, i % 2 === 0); }
    const r = mulberry(42);
    let placed = 0;
    while (placed < 16) {
      const a = r() * PI * 2, p = new V3(Math.sin(a) * 12.5, 0, Math.cos(a) * 12.5);
      if (SLOTS.some((s) => s.distanceTo(p) < 3.4) || p.distanceTo(POND) < 3.6) continue;
      const t = this.makeTree(0.8 + r() * 0.9);
      t.position.copy(p);
      g.add(t);
      placed++;
    }
    this.forest(g, 3, (p) => SLOTS.every((s) => s.distanceTo(p) > 3.4));
  }

}

/* ---------- helpers ---------- */
let roof: THREE.ConeGeometry | null = null;
function roofGeo() {
  if (!roof) {
    roof = new THREE.ConeGeometry(1, 1.3, 4);
    roof.rotateY(PI / 4);
  }
  return roof;
}
let dot: THREE.Texture | null = null;
function dotTexture() {
  if (dot) return dot;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.5, "rgba(255,255,255,.9)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  return (dot = new THREE.CanvasTexture(c));
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * PI) / 5, rr = i % 2 ? 4 : 9;
    ctx.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr);
  }
  ctx.fill();
}
