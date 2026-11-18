// ---------------------------------------------------------------------------
// The village's data model, shared by the API routes and the pages: character
// options, the villager record, and input validation. No three.js in here so
// the server can import it.
// ---------------------------------------------------------------------------

// Which show & tell a villager moved in at. Bump with the event cycle.
export const EVENT = { id: "2026-11-19", label: "19 nov 2026" };

export const SKIN = ["#f8dcc8", "#eebd98", "#d29a6c", "#a8714a", "#74462b"];
export const HAIR_COLORS = ["#2b1d14", "#6b4226", "#c79a5b", "#ecdcb4", "#b9bcc9", "#3b5bdb", "#e2725b"];
export const CLOTH = ["#021093", "#3b5bdb", "#93c5fd", "#ffffff", "#1e293b", "#e2725b", "#f2c14e", "#5fa38a"];
export const PANTS = ["#1e293b", "#021093", "#4b5b84", "#6b5644", "#d9dde8"];
export const OPTIONS = {
  hair: ["none", "short", "bun", "long", "curly", "mohawk"],
  hat: ["none", "beanie", "bobble hat", "earmuffs", "ushanka"],
  coat: ["puffer", "hoodie", "long coat"],
  extra: ["none", "glasses", "headphones", "coffee", "sketchbook", "camera"],
  emote: ["wave", "jump", "dance"],
  costume: ["none", "santa", "elf", "reindeer", "penguin", "snowman", "skier", "astronaut", "wizard", "dino"],
} as const;

export const TAGS = [
  "product design",
  "ux research",
  "ui design",
  "brand design",
  "illustration",
  "motion",
  "design engineering",
  "service design",
  "art direction",
  "type design",
  "3d",
  "design lead",
  "student",
];
export const MAX_TAGS = 3;
export const MAX_INTRO = 140;

export type Config = {
  skin: string;
  hair: (typeof OPTIONS.hair)[number];
  hairColor: string;
  hat: (typeof OPTIONS.hat)[number];
  hatColor: string;
  coat: (typeof OPTIONS.coat)[number];
  coatColor: string;
  pants: string;
  scarf: string | null;
  extra: (typeof OPTIONS.extra)[number];
  emote: (typeof OPTIONS.emote)[number];
  costume: (typeof OPTIONS.costume)[number];
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

export type VillagerInput = Pick<Villager, "name" | "tags" | "intro" | "portfolio" | "linkedin" | "twitter" | "config"> & {
  // data:image/jpeg;base64,… (256px square from the join form), null to remove, undefined to keep
  photo?: string | null;
};

export const VISITOR: Config = {
  skin: "#eebd98", hair: "short", hairColor: "#6b4226", hat: "bobble hat", hatColor: "#e2725b", coat: "puffer",
  coatColor: "#f2c14e", pants: "#1e293b", scarf: "#e2725b", extra: "none", emote: "wave", costume: "none",
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

export function randomConfig(r: () => number = Math.random): Config {
  return {
    skin: pick(r, SKIN), hair: pick(r, OPTIONS.hair), hairColor: pick(r, HAIR_COLORS), hat: pick(r, OPTIONS.hat),
    hatColor: pick(r, CLOTH), coat: pick(r, OPTIONS.coat), coatColor: pick(r, CLOTH), pants: pick(r, PANTS),
    scarf: r() < 0.6 ? pick(r, CLOTH) : null, extra: pick(r, OPTIONS.extra), emote: pick(r, OPTIONS.emote),
    costume: r() < 0.3 ? pick(r, OPTIONS.costume.slice(1)) : "none",
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

export function cleanConfig(x: unknown): Config | null {
  if (!x || typeof x !== "object") return null;
  const c = x as Record<string, unknown>;
  if (!isHex(c.skin) || !isHex(c.hairColor) || !isHex(c.hatColor) || !isHex(c.coatColor) || !isHex(c.pants)) return null;
  if (c.scarf !== null && !isHex(c.scarf)) return null;
  if (!oneOf(c.hair, OPTIONS.hair) || !oneOf(c.hat, OPTIONS.hat) || !oneOf(c.coat, OPTIONS.coat)) return null;
  if (!oneOf(c.extra, OPTIONS.extra) || !oneOf(c.emote, OPTIONS.emote)) return null;
  const costume = oneOf(c.costume, OPTIONS.costume) ? c.costume : "none";
  return {
    skin: c.skin, hair: c.hair, hairColor: c.hairColor, hat: c.hat, hatColor: c.hatColor, coat: c.coat, coatColor: c.coatColor,
    pants: c.pants, scarf: c.scarf as string | null, extra: c.extra, emote: c.emote, costume,
  };
}

export type FieldErrors = Partial<Record<"name" | "tags" | "intro" | "portfolio" | "linkedin" | "twitter" | "config" | "photo", string>>;
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i;
const MAX_PHOTO_CHARS = 300_000;

export function validateInput(body: unknown): { value: VillagerInput; errors: FieldErrors } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : "");
  const errors: FieldErrors = {};

  const name = str("name");
  if (!name) errors.name = "add your name.";
  else if (name.length > 40) errors.name = "keep it under 40 characters.";

  const tags = Array.isArray(b.tags)
    ? [...new Set(b.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean))]
    : [];
  if (!tags.length) errors.tags = "pick a role.";
  else if (tags.length > MAX_TAGS) errors.tags = `${MAX_TAGS} roles is the most.`;
  else if (tags.some((t) => t.length > 24)) errors.tags = "keep each role under 24 characters.";

  const intro = str("intro");
  if (!intro) errors.intro = "add a line about you.";
  else if (intro.length > MAX_INTRO) errors.intro = `keep it under ${MAX_INTRO} characters.`;

  const portfolio = str("portfolio");
  if (!portfolio) errors.portfolio = "add a link to your work.";
  else if (!looksLikeUrl(portfolio) || portfolio.length > 200) errors.portfolio = "that doesn't look like a link.";

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
    value: { name, tags: tags.slice(0, MAX_TAGS), intro, portfolio, linkedin, twitter, config: config ?? randomConfig(), photo },
    errors,
  };
}

export const photoUrl = (v: Pick<Villager, "id" | "updatedAt">) => `/api/villagers/${v.id}/photo?v=${v.updatedAt}`;
