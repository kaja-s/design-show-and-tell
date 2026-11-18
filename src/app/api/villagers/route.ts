import { NextResponse } from "next/server";
import { getStore, hashToken, toPublic, type StoredVillager } from "@/app/village/lib/store";
import { EVENT, validateInput } from "@/app/village/lib/villager";

// Everyone at the venue shares one wifi address, so the limit is generous.
const CREATE_LIMIT = 40;
const CREATE_WINDOW_SEC = 600;

// The whole village (no photos, no edit tokens, no emails). The big screen
// polls this. With a valid x-admin-key it also returns { emails: {id: email} }.
export async function GET(request: Request) {
  try {
    const all = await getStore().list();
    const villagers = all.map(toPublic).sort((a, b) => a.createdAt - b.createdAt);
    const admin = process.env.VILLAGE_ADMIN_KEY;
    const isAdmin = !!admin && request.headers.get("x-admin-key") === admin;
    const emails = isAdmin ? Object.fromEntries(all.map((v) => [v.id, v.email ?? ""])) : undefined;
    return NextResponse.json({ villagers, ...(emails ? { emails } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("village list error:", error);
    return NextResponse.json({ error: "couldn't load the village. try again in a moment." }, { status: 500 });
  }
}

// Move in. Returns the villager plus a private edit token the phone keeps.
export async function POST(request: Request) {
  try {
    const store = getStore();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    if (!(await store.allow(`create:${ip}`, CREATE_LIMIT, CREATE_WINDOW_SEC))) {
      return NextResponse.json({ error: "lots of people are moving in from here. try again in a few minutes." }, { status: 429 });
    }

    const { value, errors } = validateInput(await request.json().catch(() => null));
    if (Object.keys(errors).length) return NextResponse.json({ error: "check the highlighted fields.", errors }, { status: 400 });

    if (await store.idForEmail(value.email)) {
      return NextResponse.json(
        { error: "that email already lives in the village.", errors: { email: "you've already moved in. edit from the phone you joined on." } },
        { status: 409 },
      );
    }

    const token = crypto.randomUUID();
    const now = Date.now();
    const villager: StoredVillager = {
      id: crypto.randomUUID().slice(0, 12),
      name: value.name,
      tags: value.tags,
      intro: value.intro,
      portfolio: value.portfolio,
      linkedin: value.linkedin,
      twitter: value.twitter,
      config: value.config,
      hasPhoto: !!value.photo,
      event: EVENT.id,
      createdAt: now,
      updatedAt: now,
      tokenHash: await hashToken(token),
      email: value.email,
    };
    if (value.photo) await store.putPhoto(villager.id, value.photo);
    await store.put(villager);
    await store.setEmail(value.email, villager.id);
    return NextResponse.json({ villager: toPublic(villager), token }, { status: 201 });
  } catch (error) {
    console.error("village create error:", error);
    return NextResponse.json({ error: "the village can't take new people right now. try again in a moment." }, { status: 503 });
  }
}
