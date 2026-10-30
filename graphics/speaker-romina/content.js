// speaker announcement: romina ("romina" in the Paper file) — content for graphics/_engine/comp.html
// The halftone runs over a still portrait instead of the wolf video. Re-make
// romina-halftone.png from romina-cutout.png with prepare.py (see its docstring).
window.GRAPHIC = {
  file: "speaker romina",
  duration: 12,
  image: "romina-halftone.png",           // square, grayscale on white
  framing: { scale: 1.0, push: 0.02, offX: -0.083, offY: -0.106 },   // portrait 90px left, 114px down, as in Paper
  dot: 12,
  lightBg: ["#f3f7ff", "#eef2ff"],     // the posts' cooler page gradient
  keepCase: true,
  subInline: true,                      // "> design show & tell | Nov 19th, 2026 @ Visionect" on one row with the moon
  blockStyle: "highlight",
  block: { right: 90, bottom: 90 },
  toggle: { right: 90, top: 84, size: 40 },
  content: {
    label: "design show & tell",
    sub: "Nov 19th, 2026 @ Visionect",
    corner: "",
    cmd: "romina kavcic",
    out: "owner and design leader at DSG",
  },
  still: true,                          // only the theme switch and the status line animate
  typeStatus: true,
  timeline: {},
};
