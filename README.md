# design show & tell

The website for **design show & tell**, an informal meetup where designers show what they're working on. Live demos, no slides, 5–10 minutes each.

Live at [design-show-and-tell.vercel.app](https://design-show-and-tell.vercel.app).

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also type-checks)
npm run lint
```

Create `.env.local` with:

```bash
LOOPS_API_KEY=                     # Loops (loops.so) API key, used by both API routes
LOOPS_PROPOSAL_TRANSACTIONAL_ID=   # optional, see "Speaker proposals" below
```

## What's on the page

- **Wolf.** `public/wolf.mp4` rendered through a WebGL halftone shader (`src/app/components/shader-canvas.tsx`). Colours follow the theme.
- **Countdown.** Live digits once a date is set; dashes plus a "late november 2026 · exact date soon" line while it isn't.
- **FAQ.** A vertical carousel of questions with the answer below.
- **Call for speakers.** The main button opens a modal form (name, email, idea) that emails the organizer.
- **Last time.** Three photos from the previous meetup as an overlapping duotone collage; hover for full colour.
- **Theme toggle** (light/dark) and a page loader for slow connections.

## The event cycle

The site has three phases. Switch between them in `src/app/page.tsx` by mounting one of:

| Phase | Component | When |
| --- | --- | --- |
| Looking for speakers | `<SpeakerProposal />` | now |
| Between events, lineup full | `<StayUpToDate />` | collects emails into Loops |
| Event announced | `<Rsvp />` | links to the lu.ma page |

When a date is confirmed, also update:

1. `NEXT_EVENT` in `src/app/components/countdown.tsx`
2. The "when + where?" answer in `src/app/components/faq.tsx`
3. The lu.ma link in `src/app/components/rsvp.tsx`

## Speaker proposals

The form posts to `/api/propose`, which sends a Loops transactional email to the organizer inbox set in `src/app/api/propose/route.ts`.

One-time setup in Loops: create a transactional email with the data variables `name`, `email` and `proposal`, publish it, and put its ID in `LOOPS_PROPOSAL_TRANSACTIONAL_ID`. Until that's set, the form falls back to a pre-filled `mailto:` link so no proposal is lost.

The "stay up to date" form posts to `/api/subscribe`, which adds the contact to the mailing list ID hardcoded in that route.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript. Loading indicators from [loading-dev](https://loading.dev). Icons from Feather. Deployed on Vercel with Vercel Analytics.

## Extras

- `scripts/capture-shader.js` re-renders the wolf video through the halftone shader to an MP4 (needs `ffmpeg`).
- `docs/` holds standalone design write-ups made while building the site; they aren't part of the build.

## Colophon

Design references: [ÌníOlúwa Abíódún](https://www.iniabiodun.com/), [Dan Hollick](https://x.com/DanHollick/status/1978503090308304899), [Mitul Shah](https://github.com/mitul-s/mitul.ca).
