import { NextResponse } from "next/server";
import { getStore } from "@/app/village/lib/store";
import { validateLetter } from "@/app/village/lib/villager";

// Letters from the village mailbox. POST drops one in; GET (with the admin
// key) reads them, newest first.
const LIMIT = 10;
const WINDOW_SEC = 600;

export async function POST(request: Request) {
  try {
    const store = getStore();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    if (!(await store.allow(`letter:${ip}`, LIMIT, WINDOW_SEC))) {
      return NextResponse.json({ error: "the mailbox is full for now. try again in a few minutes." }, { status: 429 });
    }
    const { value, errors } = validateLetter(await request.json().catch(() => null));
    if (Object.keys(errors).length) return NextResponse.json({ error: "check the highlighted fields.", errors }, { status: 400 });
    await store.addLetter({ id: crypto.randomUUID().slice(0, 12), ...value, at: Date.now() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("letter error:", error);
    return NextResponse.json({ error: "the mailbox is stuck. try again in a moment." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const admin = process.env.VILLAGE_ADMIN_KEY;
  if (!admin || request.headers.get("x-admin-key") !== admin) return NextResponse.json({ error: "not allowed." }, { status: 403 });
  try {
    return NextResponse.json({ letters: await getStore().letters() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("letters list error:", error);
    return NextResponse.json({ error: "couldn't load the letters." }, { status: 500 });
  }
}
