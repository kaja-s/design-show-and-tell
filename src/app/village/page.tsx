import { VillageApp } from "./village-app";

// /village          walk around and meet people
// /village?screen   the big screen at the event: orbiting camera, qr code, new arrivals
// /village?me=<id>  start next to someone (the join form links here after you move in)
export default async function VillagePage({ searchParams }: PageProps<"/village">) {
  const sp = await searchParams;
  const me = Array.isArray(sp.me) ? sp.me[0] : sp.me;
  return <VillageApp screen={"screen" in sp} me={me ?? null} />;
}
