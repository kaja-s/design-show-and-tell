import type { NextRequest } from "next/server";
import { getStore } from "@/app/village/lib/store";

// Serves a villager's uploaded photo. Callers add ?v=<updatedAt>, so a new
// photo gets a new url and the old one can be cached forever.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/villagers/[id]/photo">) {
  const { id } = await ctx.params;
  const dataUrl = await getStore().getPhoto(id);
  const match = dataUrl?.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
  if (!match) return new Response("not found", { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
