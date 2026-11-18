// ---------------------------------------------------------------------------
// Villager storage (server only). Upstash Redis when its env vars are set
// (KV_REST_API_* from the Vercel integration, or UPSTASH_REDIS_REST_*);
// otherwise a .village.json file in the project root, so the village also
// works when it's hosted from a laptop at the event.
// ---------------------------------------------------------------------------
import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";
import type { Villager } from "./villager";

// The record as stored: the public villager plus the hash of its edit token
// and the private email (absent on villagers from before emails were asked).
export type StoredVillager = Villager & { tokenHash: string; email?: string };

export type Store = {
  kind: "redis" | "file";
  list(): Promise<StoredVillager[]>;
  get(id: string): Promise<StoredVillager | null>;
  put(v: StoredVillager): Promise<void>;
  remove(id: string): Promise<void>;
  getPhoto(id: string): Promise<string | null>;
  putPhoto(id: string, dataUrl: string | null): Promise<void>;
  // email -> villager id, so one email can't move in twice
  idForEmail(email: string): Promise<string | null>;
  setEmail(email: string, id: string | null): Promise<void>;
  // true if this caller is under the limit (count per window)
  allow(key: string, limit: number, windowSec: number): Promise<boolean>;
};

const VILLAGERS = "village:villagers";
const PHOTO = (id: string) => `village:photo:${id}`;
const EMAIL = (email: string) => `village:email:${email}`;

const parse = (raw: unknown): StoredVillager | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as StoredVillager;
    } catch {
      return null;
    }
  }
  return raw as StoredVillager; // the client auto-parses JSON values
};

function redisStore(redis: Redis): Store {
  return {
    kind: "redis",
    async list() {
      const all = (await redis.hgetall<Record<string, unknown>>(VILLAGERS)) ?? {};
      return Object.values(all).map(parse).filter((v): v is StoredVillager => !!v);
    },
    async get(id) {
      return parse(await redis.hget(VILLAGERS, id));
    },
    async put(v) {
      await redis.hset(VILLAGERS, { [v.id]: JSON.stringify(v) });
    },
    async remove(id) {
      const v = parse(await redis.hget(VILLAGERS, id));
      await redis.hdel(VILLAGERS, id);
      await redis.del(PHOTO(id));
      if (v?.email && (await redis.get<string>(EMAIL(v.email))) === id) await redis.del(EMAIL(v.email));
    },
    async idForEmail(email) {
      return (await redis.get<string>(EMAIL(email))) ?? null;
    },
    async setEmail(email, id) {
      if (id) await redis.set(EMAIL(email), id);
      else await redis.del(EMAIL(email));
    },
    async getPhoto(id) {
      return (await redis.get<string>(PHOTO(id))) ?? null;
    },
    async putPhoto(id, dataUrl) {
      if (dataUrl) await redis.set(PHOTO(id), dataUrl);
      else await redis.del(PHOTO(id));
    },
    async allow(key, limit, windowSec) {
      const k = `village:rl:${key}`;
      const n = await redis.incr(k);
      if (n === 1) await redis.expire(k, windowSec);
      return n <= limit;
    },
  };
}

type FileData = { villagers: Record<string, StoredVillager>; photos: Record<string, string>; emails?: Record<string, string> };
const FILE = path.join(process.cwd(), ".village.json");

function fileStore(): Store {
  // Writes are chained so two quick saves can't interleave and lose one.
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<FileData> => {
    try {
      return JSON.parse(await fs.readFile(FILE, "utf8")) as FileData;
    } catch {
      return { villagers: {}, photos: {} };
    }
  };
  const update = (fn: (d: FileData) => void) => {
    const next = queue.then(async () => {
      const d = await read();
      fn(d);
      await fs.writeFile(FILE, JSON.stringify(d));
    });
    queue = next.catch(() => {});
    return next;
  };
  return {
    kind: "file",
    async list() {
      return Object.values((await read()).villagers);
    },
    async get(id) {
      return (await read()).villagers[id] ?? null;
    },
    put: (v) => update((d) => void (d.villagers[v.id] = v)),
    remove: (id) =>
      update((d) => {
        const email = d.villagers[id]?.email;
        if (email && d.emails?.[email] === id) delete d.emails[email];
        delete d.villagers[id];
        delete d.photos[id];
      }),
    async idForEmail(email) {
      return (await read()).emails?.[email] ?? null;
    },
    setEmail: (email, id) =>
      update((d) => {
        d.emails ??= {};
        if (id) d.emails[email] = id;
        else delete d.emails[email];
      }),
    async getPhoto(id) {
      return (await read()).photos[id] ?? null;
    },
    putPhoto: (id, dataUrl) => update((d) => { if (dataUrl) d.photos[id] = dataUrl; else delete d.photos[id]; }),
    async allow() {
      return true;
    },
  };
}

let store: Store | null = null;
export function getStore(): Store {
  if (store) return store;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  store = url && token ? redisStore(new Redis({ url, token })) : fileStore();
  return store;
}

export function toPublic(stored: StoredVillager): Villager {
  const { tokenHash, email, ...v } = stored;
  void tokenHash;
  void email;
  return v;
}

export async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Buffer.from(bytes).toString("hex");
}
