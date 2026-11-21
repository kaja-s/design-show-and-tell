"use client";

// The newsletter banner: 600×164 (the usual email column), in either of the
// site's themes. The wolf stands on the left end of the title block, howling (its loop is the
// only motion). graphics/newsletter/render.js turns each one into the gif and
// png the email uses.

import { HALFTONE_INK, ShaderCanvas } from "../components/shader-canvas";

export const BANNER_W = 600;
export const BANNER_H = 164; // 20px above the ears, 20px under the block

export type BannerTheme = "night" | "day";

// the site's tokens (globals.css :root and :root.dark), scoped to the banner so it
// renders the same whatever theme the page is in
const TOKENS: Record<BannerTheme, React.CSSProperties> = {
  night: {
    "--background": "#040c2a",
    "--foreground": "#93c5fd",
    "--foreground-muted": "rgba(147, 197, 253, 0.5)",
    "--highlight": "#93c5fd",
    "--highlight-text": "#040c2a",
  } as React.CSSProperties,
  day: {
    "--background": "#ffffff",
    "--foreground": "#021093",
    "--foreground-muted": "rgba(2, 16, 147, 0.5)",
    "--highlight": "#021093",
    "--highlight-text": "#ffffff",
  } as React.CSSProperties,
};

// Day sits on the email's white, so its text starts at the image's left edge and
// lines up with the email's body text. Night is its own dark block and needs an
// inset.
const INSET: Record<BannerTheme, string> = { day: "px-0", night: "px-[24px]" };

/** `centered`: the same stack centred in the banner, the wolf over the middle of
    the block. */
export function Banner({ theme, centered = false }: { theme: BannerTheme; centered?: boolean }) {
  return (
    <div
      style={TOKENS[theme]}
      className={`relative size-full bg-background text-foreground overflow-hidden flex items-end pb-[20px] ${centered ? "justify-center" : INSET[theme]}`}
    >
      <div className={`flex flex-col gap-[12px] ${centered ? "items-center" : "items-start"}`}>
        {/* the block the wolf stands on */}
        <div className="relative">
          {/* feet on the block's top edge, at its left end (on the text's edge),
              20px clear above the ears; 21 dots across keeps the site's dot size (~4.6px) */}
          {/* centred: the wolf's ink leans left in its square (its snout is at the
              right), so it sits 8px right of the block's middle to look centred */}
          <ShaderCanvas
            className={`absolute bottom-[calc(100%-5px)] size-[96px] ${centered ? "left-[calc(50%-40px)]" : "left-0"}`}
            cells={21}
            ink={theme === "night" ? HALFTONE_INK.dark : HALFTONE_INK.light}
          />
          <h2 className="relative text-[26px] leading-[1.15] font-bold tracking-[-0.02em]">
            {/* the site's status-line label */}
            <span className="block bg-highlight text-highlight-text px-[0.3em] py-[0.04em]">
              <span aria-hidden="true">&gt; </span>
              design show &amp; tell
            </span>
          </h2>
        </div>
      </div>
    </div>
  );
}

/** Just the wolf, howling, on the light theme, at the left edge (where the email's
    body text starts). 124px with 20px above and below fills the same 164px height;
    27 dots across keeps the site's dot size. */
export function WolfBanner() {
  return (
    <div style={TOKENS.day} className="relative size-full bg-background overflow-hidden">
      <ShaderCanvas className="absolute top-[20px] left-0 size-[124px]" cells={27} ink={HALFTONE_INK.light} />
    </div>
  );
}
