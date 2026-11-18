import { NextResponse, type NextRequest } from "next/server";
import { getStore, hashToken, toPublic } from "@/app/village/lib/store";
import { validateInput } from "@/app/village/lib/villager";

// The phone that created a villager holds its edit token (x-edit-token);
// the organiser can remove anyone with VILLAGE_ADMIN_KEY (x-admin-key).
async function authorised(request: NextRequest, tokenHash: string) {
  const admin = process.env.VILLAGE_ADMIN_KEY;
  const adminKey = request.headers.get("x-admin-key");
  if (admin && adminKey && adminKey === admin) return true;
  const token = request.headers.get("x-edit-token");
  return !!token && (await hashToken(token)) === tokenHash;
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/villagers/[id]">) {
  const { id } = await ctx.params;
  const v = await getStore().get(id);
  if (!v) return NextResponse.json({ error: "nobody lives here anymore." }, { status: 404 });
  return NextResponse.json({ villager: toPublic(v) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/villagers/[id]">) {
  try {
    const { id } = await ctx.params;
    const store = getStore();
    const current = await store.get(id);
    if (!current) return NextResponse.json({ error: "nobody lives here anymore." }, { status: 404 });
    if (!(await authorised(request, current.tokenHash))) return NextResponse.json({ error: "you can only edit your own character." }, { status: 403 });

    const { value, errors } = validateInput(await request.json().catch(() => null));
    if (Object.keys(errors).length) return NextResponse.json({ error: "check the highlighted fields.", errors }, { status: 400 });

    if (value.photo !== undefined) await store.putPhoto(id, value.photo);
    const next = {
      ...current,
      name: value.name,
      tags: value.tags,
      intro: value.intro,
      portfolio: value.portfolio,
      linkedin: value.linkedin,
      twitter: value.twitter,
      config: value.config,
      hasPhoto: value.photo === undefined ? current.hasPhoto : !!value.photo,
      updatedAt: Date.now(),
    };
    await store.put(next);
    return NextResponse.json({ villager: toPublic(next) });
  } catch (error) {
    console.error("village update error:", error);
    return NextResponse.json({ error: "couldn't save your changes. try again in a moment." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/villagers/[id]">) {
  try {
    const { id } = await ctx.params;
    const store = getStore();
    const current = await store.get(id);
    if (!current) return NextResponse.json({ success: true });
    if (!(await authorised(request, current.tokenHash))) return NextResponse.json({ error: "you can only remove your own character." }, { status: 403 });
    await store.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("village delete error:", error);
    return NextResponse.json({ error: "couldn't remove that right now. try again in a moment." }, { status: 503 });
  }
}
