"use client";

// /banner: the newsletter banners at their real size: night, day, day centred, and the wolf alone.
// graphics/newsletter/render.js needs a 2× screenshot of each with the wolf canvas
// hidden (see graphics/README.md).

import { BANNER_H, BANNER_W, Banner, WolfBanner } from "./banner";

export default function BannerPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-[#e9ebf2] p-6">
      {([
        ["night", "night", false],
        ["day", "day", false],
        ["day-centered", "day", true],
      ] as const).map(([name, theme, centered]) => (
        <div key={name} data-banner={name} style={{ width: BANNER_W, height: BANNER_H }}>
          <Banner theme={theme} centered={centered} />
        </div>
      ))}
      <div data-banner="day-wolf" style={{ width: BANNER_W, height: BANNER_H }}>
        <WolfBanner />
      </div>
    </main>
  );
}
