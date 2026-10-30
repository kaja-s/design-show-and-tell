// speaker announcement, talk-title version: nika ("nika #2" in the Paper file, option B: four short title lines) — content for graphics/_engine/comp.html
// Same portrait as speaker-nika; the talk title leads, typed left to right row by row.
window.GRAPHIC = {
  file: "speaker nika talk b",
  duration: 12,
  image: "../speaker-nika/nika-halftone.png",   // resolved against this folder
  framing: { scale: 0.928, push: 0.02, offX: -0.0444, offY: -0.0019 },   // 1002px portrait, 48px left, 80px down, as in Paper
  dot: 12,
  lightBg: ["#f3f7ff", "#eef2ff"],
  keepCase: true,
  subInline: true,                      // "> design show & tell | Nov 19th, 2026 @ Visionect" on one row with the moon
  blockStyle: "highlight",
  block: { right: 90, top: 661 },
  toggle: { right: 90, top: 84, size: 40 },
  content: {
    label: "design show & tell",
    sub: "Nov 19th, 2026 @ Visionect",
    corner: "",
    cmd: "",
    out: "",
  },
  rows: [
    { kind: "title", prompt: ">", text: "every process" },
    { kind: "title", text: "i’ve worked in," },
    { kind: "title", text: "and why i’m back" },
    { kind: "title", text: "to just designing" },
    { kind: "byline", text: "nika vižintin prinz", tail: " | product designer at aikido" },
  ],
  css: `
    #block.rows { gap: 6px; }
    .row.title .pill { font-size: 54px; line-height: 64px; letter-spacing: -0.02em; padding: 0 16px; }
    .row.title .prompt { margin-right: 11px; }
    .row.byline { margin-top: 8px; }
    .row.byline .pill { font-size: 27px; line-height: 38px; }
  `,
  still: true,                          // only the theme switch and the status line animate
  typeStatus: true,
  timeline: {},
};
