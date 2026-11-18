// Everything the slides say. Edit copy here; slides.tsx only lays it out.
// Times are local (the projector laptop's clock); the timeline highlights the
// slot that's running now, but only on the event day.

export const EVENT = {
  edition: "III",
  day: "2026-11-19",
  dateLabel: "november 19, 2026",
  venue: "visionect, tržaška cesta 118",
  ends: "20:00",
};

export type Person = {
  name: string;
  role: string;
  bio?: string;
  talk?: string;
  /** square, grayscale on white (white is dropped by the halftone). null = no photo yet */
  photo: string | null;
  initials: string;
};

// Photos: cut the background out (macOS Vision subject lifting, any remover
// works), flatten on white, grayscale, square. Hosts are framed head-and-shoulders with the
// shoulders running off the left edge, so the dots line up with the text below.
export const HOSTS: Person[] = [
  {
    name: "kaja skerlj",
    role: "product designer at codeplain",
    bio: "designs tools for building software with ai. made this website, and the village you're about to move into.",
    photo: "/slides/kaja-halftone.png",
    initials: "ks",
  },
  {
    name: "anuška đogić",
    role: "product designer at visionect",
    bio: "designs for e-paper at visionect, and opened the doors for us tonight.",
    photo: "/slides/anuska-halftone.png",
    initials: "ađ",
  },
];

export const SPONSOR = {
  name: "visionect",
  line: "for opening your office to us tonight.",
};

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
    role: "product leader, owner of dsg",
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

/** The slide after the activity: who goes first. */
export const FIRST_UP = SPEAKERS[0];
