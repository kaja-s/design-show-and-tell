// speaker announcement, talk-title version: nika ("nika #1" in the Paper file) — content for graphics/_engine/comp.html
// Same portrait as speaker-nika; the talk title leads, typed left to right row by row.
window.GRAPHIC = {
  file: "speaker nika talk",
  duration: 12,
  image: "../speaker-nika/nika-halftone.png",   // resolved against this folder
  framing: { scale: 1.0, push: 0.02, offX: -0.0406, offY: -0.0556 },   // portrait 44px left, 60px down, as in Paper
  dot: 12,
  lightBg: ["#f3f7ff", "#eef2ff"],
  keepCase: true,
  subInline: true,                      // "> design show & tell | Nov 19th, 2026 @ Visionect" on one row with the moon
  blockStyle: "highlight",
  block: { right: 67, top: 824 },
  toggle: { right: 90, top: 84, size: 40 },
  content: {
    label: "design show & tell",
    sub: "Nov 19th, 2026 @ Visionect",
    corner: "",
    cmd: "",
    out: "",
  },
  rows: [
    { kind: "title", prompt: ">", text: "every process i’ve worked in,", lineHeight: 66 },
    { kind: "title", text: "and why i’m back to just designing", lineHeight: 58 },
    { kind: "byline", text: "nika vižintin prinz", tail: " | product designer at aikido" },
  ],
  still: true,                          // only the theme switch and the status line animate
  typeStatus: true,
  timeline: {},
};
