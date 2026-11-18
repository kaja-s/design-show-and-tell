// Everything the slides say. Edit copy here; slides.tsx only lays it out.
// Times are local (the projector laptop's clock); the timeline highlights the
// slot that's running now, but only on the event day.

export const EVENT = {
  edition: "III",
  day: "2026-11-19",
  dateLabel: "november 19, 2026",
  venue: "visionect, tržaška cesta 118",
  ends: "20:30", // as on the lu.ma page
};

export type Person = {
  name: string;
  role: string;
  /** shown as its logo on the line under the role (hosts) */
  company?: "codeplain" | "visionect";
  bio?: string;
  talk?: string;
  /** square, grayscale on white (white is dropped by the halftone). null = no photo yet */
  photo: string | null;
  /** hosts: how wide the photo is drawn (default 400). A loosely framed photo runs larger,
      growing up into its own empty top, so both hosts' heads come out the same size */
  photoSize?: number;
  initials: string;
};

// Photos: cut the background out (macOS Vision subject lifting, any remover
// works), flatten on white, grayscale, square. Hosts are framed head-and-shoulders with the
// shoulders running off the left edge, so the dots line up with the text below.
export const HOSTS: Person[] = [
  {
    name: "kaja skerlj",
    role: "founding product designer",
    company: "codeplain",
    bio: "making interfaces for ai code generation.",
    photo: "/slides/kaja-tint.png",
    photoSize: 540,
    initials: "ks",
  },
  {
    name: "anuška đogić",
    role: "product designer",
    company: "visionect",
    bio: "product designer specializing in web, mobile, and digital product design.",
    photo: "/slides/anuska-tint.png",
    initials: "ađ",
  },
];

export const SPONSOR = {
  name: "visionect",
};

// In running order: each gets an intro slide after the village ("up first", then "up next").
export const SPEAKERS: Person[] = [
  {
    name: "nika vižintin prinz",
    role: "product designer at aikido security",
    talk: "the processes i've worked through, and why i came back to design",
    photo: "/slides/nika-halftone.png",
    initials: "nvp",
  },
  {
    name: "romina kavcic",
    role: "owner of dsg and design leader",
    talk: "agentic design",
    photo: "/slides/romina-halftone.png",
    initials: "rk",
  },
  {
    name: "nina rojc",
    role: "senior ux designer at canonical",
    talk: "80% of my job isn't design. here's how i make the other 20% count",
    photo: "/slides/nina-halftone.png",
    initials: "nr",
  },
];

export type Slot = { at: string; title: string; sub?: string; speaker?: Person };

export const TIMELINE: Slot[] = [
  { at: "18:00", title: "welcome + meet" },
  { at: "18:30", title: SPEAKERS[0].name, sub: SPEAKERS[0].talk, speaker: SPEAKERS[0] },
  { at: "18:50", title: SPEAKERS[1].name, sub: SPEAKERS[1].talk, speaker: SPEAKERS[1] },
  { at: "19:10", title: SPEAKERS[2].name, sub: SPEAKERS[2].talk, speaker: SPEAKERS[2] },
  { at: "19:30", title: "hang out + pizza" },
];

export const VILLAGE = {
  joinUrl: "design-show-and-tell.vercel.app/village/join",
  steps: ["scan the code", "make your villager", "find someone you haven't met yet"],
};

/** The last slide, up during the hang out. The qr (public/qr.svg) points at the site, where
    people can sign up to hear about the next one. */
export const CLOSING = {
  siteUrl: "design-show-and-tell.vercel.app",
};
