// The spinning character on the join form: a pedestal, the character, drag to spin.
import * as THREE from "three";
import { EMOTE_LEN, addLights, buildVillager, pose, toon, type Parts, type PoseState } from "./characters";
import type { Config } from "./villager";

export class Preview {
  private r: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private parts: Parts | null = null;
  private state: PoseState = { mode: "idle", emote: "wave", et: 0 };
  private rotY = 0.5;
  private vel = 0;
  private raf = 0;
  private last = performance.now();
  private dragging = false;
  private lastX = 0;
  private obs: ResizeObserver;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Repeat the hello move every few seconds (welcome and done screens).
  loopEmote = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.r.setClearColor(0x000000, 0);
    addLights(this.scene);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.18, 48), toon("#f2f7ff"));
    ped.position.y = -0.09;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.04, 8, 48), toon("#93c5fd"));
    rim.rotation.x = Math.PI / 2;
    this.scene.add(ped, rim);
    this.cam.position.set(0, 1.45, 6.2);
    this.cam.lookAt(0, 1.2, 0);
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerup", this.up);
    this.obs = new ResizeObserver(() => this.resize());
    this.obs.observe(canvas);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }
  setConfig(c: Config) {
    if (this.parts) this.scene.remove(this.parts.root);
    this.parts = buildVillager(c);
    this.scene.add(this.parts.root);
  }
  playEmote(emote: Config["emote"]) {
    this.state = { mode: "emote", emote, et: 0 };
  }
  spin() {
    this.vel = 0.25;
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    this.obs.disconnect();
    this.canvas.removeEventListener("pointerdown", this.down);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerup", this.up);
    this.r.dispose();
  }
  private down = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.canvas.setPointerCapture(e.pointerId);
  };
  private move = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.vel = (e.clientX - this.lastX) * 0.012;
    this.rotY += this.vel;
    this.lastX = e.clientX;
  };
  private up = () => {
    this.dragging = false;
  };
  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.parts) return;
    this.vel *= 0.92;
    this.rotY += this.vel + (Math.abs(this.vel) < 0.002 && !this.reduced ? dt * 0.25 : 0);
    this.parts.root.rotation.y = this.rotY;
    this.state.et += dt;
    if (this.state.mode === "emote" && this.state.et > EMOTE_LEN) this.state = { ...this.state, mode: "idle", et: 0 };
    if (this.loopEmote && this.state.mode === "idle" && this.state.et > 1.2) this.state = { ...this.state, mode: "emote", et: 0 };
    pose(this.parts, now / 1000, this.state);
    this.r.render(this.scene, this.cam);
  };
}
