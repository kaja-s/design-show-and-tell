// event announcement, meetup announcement ("join us" in the Paper file) — content for graphics/_engine/comp.html
// A quiet status line top-left (no fill, cursor blinking); the wolf howls toward the theme toggle, the title sits in solid
// highlight blocks right-aligned to the 90px margin.
window.GRAPHIC = {
  file: "event",
  duration: 12,
  // the full wolf frame at 1079px, left -34 / top 57, as placed in Paper
  framing: { scale: 0.999, push: 0.02, offX: -0.0315, offY: -0.0519 },
  dot: 11,
  wolfIn: false,                        // wolf already there, howling from frame 0
  placed: true,                         // moon, title and date are there from frame 0; only the status line types
  lightBg: ["#f3f7ff", "#eef2ff"],     // the posts' cooler page gradient
  keepCase: true,                       // "Visionect" keeps its capital
  blockStyle: "highlight",
  labelCursor: true,
  subInline: true,                      // "> design show & tell | Nov 19th, 2026 @ Visionect" on one row
  block: { right: 90, top: 763 },
  toggle: { right: 90, top: 84, size: 40 },
  content: {
    label: "meetup for designers",
    sub: "",
    corner: "",
    cmd: "design show & tell",
    out: "Nov 19th, 2026 | 18:00 @ Visionect",
  },
  timeline: {},
};
