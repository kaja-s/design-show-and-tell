// ---------------------------------------------------------------------------
// The village's data model, shared by the API routes and the pages: character
// options, the villager record, and input validation. No three.js in here so
// the server can import it.
// ---------------------------------------------------------------------------

// Which show & tell a villager moved in at. Bump with the event cycle.
export const EVENT = { id: "2026-11-19", label: "19 nov 2026" };

// Character options. Sprites (lib/sprites.ts) are drawn in these colours over
// a city in the site's blues, so the palette favours colours that pop on it.
export const SKIN = ["#f8dcc8", "#eebd98", "#d29a6c", "#a8714a", "#74462b"];
export const HAIR_COLORS = ["#1b1d33", "#4a2c1d", "#8a5a3b", "#d9a65b", "#ece3cf", "#b9bcc9", "#d9453b", "#3b5bdb"];
export const COLORS = ["#d9453b", "#f28b3c", "#f2c14e", "#3f9b6e", "#7cc3f0", "#3b5bdb", "#021093", "#9b5de5", "#f2a7c3", "#f4f4f4", "#262a40", "#8a5a3b"];
export const PANTS = ["#2f3350", "#4b5568", "#021093", "#6b5644", "#d9dde8", "#262a40"];
export const OPTIONS = {
  hair: ["none", "short", "messy", "bun", "ponytail", "long", "curly"],
  top: ["tee", "stripes", "hoodie", "jacket", "puffer"],
  hat: ["none", "beanie", "cap"],
  extra: ["none", "glasses", "headphones", "clip", "scarf"],
  carry: ["none", "coffee", "tote", "laptop", "sketchbook"],
  pet: ["none", "dog", "cat"],
  emote: ["wave", "jump", "spin"],
} as const;

// A short list to pick from; anything else can be typed in on the join form.
export const TAGS = ["product design", "ui/ux design", "brand design", "illustration", "motion", "design leadership", "own a studio", "student"];
export const MAX_TAGS = 3;
export const MAX_INTRO = 140;

export type Config = {
  skin: string;
  hair: (typeof OPTIONS.hair)[number];
  hairColor: string;
  top: (typeof OPTIONS.top)[number];
  topColor: string;
  pants: string;
  hat: (typeof OPTIONS.hat)[number];
  // hat colour, also used for the clip, scarf and headphones
  accent: string;
  extra: (typeof OPTIONS.extra)[number];
  carry: (typeof OPTIONS.carry)[number];
  pet: (typeof OPTIONS.pet)[number];
  emote: (typeof OPTIONS.emote)[number];
};

// What everyone can read. The photo is served separately (/api/villagers/[id]/photo)
// so polling the list stays small.
export type Villager = {
  id: string;
  name: string;
  tags: string[];
  intro: string;
  portfolio: string;
  linkedin: string;
  twitter: string;
  config: Config;
  hasPhoto: boolean;
  event: string;
  createdAt: number;
  updatedAt: number;
};

// email is private: stored with the villager for a future "edit from any
// device" login, never returned by the public api.
export type VillagerInput = Pick<Villager, "name" | "tags" | "intro" | "portfolio" | "linkedin" | "twitter" | "config"> & {
  email: string;
  // data:image/jpeg;base64,… (256px square from the join form), null to remove, undefined to keep
  photo?: string | null;
};

export const VISITOR: Config = {
  skin: "#eebd98", hair: "short", hairColor: "#4a2c1d", top: "puffer", topColor: "#f2c14e", pants: "#2f3350",
  hat: "beanie", accent: "#d9453b", extra: "scarf", carry: "none", pet: "none", emote: "wave",
};

export function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];

// A fresh face for the join form: random colours and hair, but nothing extra
// (no hat, accessory, carried thing or pet), so people add those themselves.
export function defaultConfig(r: () => number = Math.random): Config {
  return { ...randomConfig(r), hat: "none", extra: "none", carry: "none", pet: "none" };
}

export function randomConfig(r: () => number = Math.random): Config {
  return {
    skin: pick(r, SKIN), hair: pick(r, OPTIONS.hair.slice(1)), hairColor: pick(r, HAIR_COLORS), top: pick(r, OPTIONS.top),
    topColor: pick(r, COLORS), pants: pick(r, PANTS), hat: r() < 0.35 ? pick(r, OPTIONS.hat.slice(1)) : "none", accent: pick(r, COLORS),
    extra: r() < 0.5 ? pick(r, OPTIONS.extra.slice(1)) : "none", carry: r() < 0.4 ? pick(r, OPTIONS.carry.slice(1)) : "none",
    pet: r() < 0.2 ? pick(r, OPTIONS.pet.slice(1)) : "none", emote: pick(r, OPTIONS.emote),
  };
}

// ---------------------------------------------------------------------------
// Links: people type handles, bare domains or full urls.
// ---------------------------------------------------------------------------
export const looksLikeUrl = (v: string) => /^(https?:\/\/)?[^\s./]+(\.[^\s./]+)+(\/\S*)?$/i.test(v.trim());

export function normLink(value: string, kind: "portfolio" | "linkedin" | "twitter") {
  let v = value.trim();
  if (!v) return null;
  if (kind === "twitter" && !/[./]/.test(v)) v = "x.com/" + v.replace(/^@/, "");
  if (kind === "linkedin" && !/[./]/.test(v)) v = "linkedin.com/in/" + v.replace(/^@/, "");
  const href = /^https?:\/\//i.test(v) ? v : "https://" + v;
  if (!/^https?:\/\//i.test(href)) return null;
  return { href, text: v.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") };
}

// ---------------------------------------------------------------------------
// Validation, used by the API (authoritative) and the join form (for messages).
// ---------------------------------------------------------------------------
const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

// Lenient: any field that's missing or invalid falls back to a default, so
// characters saved with older options (the 3d village) still draw.
export function cleanConfig(x: unknown): Config | null {
  if (!x || typeof x !== "object") return null;
  const c = x as Record<string, unknown>;
  const d = VISITOR;
  const hex = (v: unknown, fb: string) => (isHex(v) ? v : fb);
  const opt = <T extends string>(v: unknown, list: readonly T[], fb: T): T => (oneOf(v, list) ? v : fb);
  return {
    skin: hex(c.skin, d.skin),
    hair: opt(c.hair, OPTIONS.hair, "short"),
    hairColor: hex(c.hairColor, d.hairColor),
    top: opt(c.top, OPTIONS.top, "tee"),
    topColor: hex(c.topColor ?? c.coatColor, "#3b5bdb"),
    pants: hex(c.pants, d.pants),
    hat: opt(c.hat, OPTIONS.hat, "none"),
    accent: hex(c.accent ?? c.hatColor, d.accent),
    extra: opt(c.extra, OPTIONS.extra, "none"),
    carry: opt(c.carry, OPTIONS.carry, "none"),
    pet: opt(c.pet, OPTIONS.pet, "none"),
    emote: opt(c.emote, OPTIONS.emote, "wave"),
  };
}

export type FieldErrors = Partial<Record<"name" | "email" | "tags" | "intro" | "portfolio" | "linkedin" | "twitter" | "config" | "photo" | "text", string>>;
// Same pattern as components/form-field.tsx (that module is client-only).
export const VILLAGE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normEmail = (v: string) => v.trim().toLowerCase();
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i;
const MAX_PHOTO_CHARS = 300_000;

export function validateInput(body: unknown): { value: VillagerInput; errors: FieldErrors } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : "");
  const errors: FieldErrors = {};

  const name = str("name");
  if (!name) errors.name = "add your name.";
  else if (name.length > 40) errors.name = "keep it under 40 characters.";

  const email = normEmail(str("email"));
  if (!email) errors.email = "add your email.";
  else if (!VILLAGE_EMAIL_RE.test(email) || email.length > 200) errors.email = "that doesn't look like an email.";

  const tags = Array.isArray(b.tags)
    ? [...new Set(b.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean))]
    : [];
  if (!tags.length) errors.tags = "pick a role.";
  else if (tags.length > MAX_TAGS) errors.tags = `${MAX_TAGS} roles is the most.`;
  else if (tags.some((t) => t.length > 24)) errors.tags = "keep each role under 24 characters.";

  const intro = str("intro");
  if (intro.length > MAX_INTRO) errors.intro = `keep it under ${MAX_INTRO} characters.`;

  const portfolio = str("portfolio");
  if (portfolio && (!looksLikeUrl(portfolio) || portfolio.length > 200)) errors.portfolio = "that doesn't look like a link.";

  const linkedin = str("linkedin");
  if (linkedin.length > 200) errors.linkedin = "that link is too long.";
  const twitter = str("twitter");
  if (twitter.length > 200) errors.twitter = "that link is too long.";

  const config = cleanConfig(b.config);
  if (!config) errors.config = "your character didn't come through. try again.";

  let photo: string | null | undefined;
  if (b.photo === null) photo = null;
  else if (typeof b.photo === "string") {
    if (!PHOTO_RE.test(b.photo) || b.photo.length > MAX_PHOTO_CHARS) errors.photo = "that photo didn't work. try a smaller jpg or png.";
    else photo = b.photo;
  }

  return {
    value: { name, email, tags: tags.slice(0, MAX_TAGS), intro, portfolio, linkedin, twitter, config: config ?? randomConfig(), photo },
    errors,
  };
}

export const photoUrl = (v: Pick<Villager, "id" | "updatedAt">) => `/api/villagers/${v.id}/photo?v=${v.updatedAt}`;

// A letter for the organiser, from the mailbox in the village. Name and email
// are optional (the email is only so she can write back).
export const MAX_LETTER = 2000;
export function validateLetter(body: unknown): { value: { name: string; email: string; text: string }; errors: FieldErrors } {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(b.name).slice(0, 60), email = str(b.email).toLowerCase(), text = str(b.text);
  const errors: FieldErrors = {};
  if (!text) errors.text = "write something first.";
  else if (text.length > MAX_LETTER) errors.text = `keep it under ${MAX_LETTER} characters.`;
  if (email && (!VILLAGE_EMAIL_RE.test(email) || email.length > 200)) errors.email = "that doesn't look like an email.";
  return { value: { name, email, text }, errors };
}
