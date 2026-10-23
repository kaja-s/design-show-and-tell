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

- **Wolf.** `public/wolf-web.mp4` (a small web encode of the master `public/wolf.mp4`) rendered through a WebGL halftone shader (`src/app/components/shader-canvas.tsx`). Colours follow the theme.
- **Countdown.** Live digits once a date is set; dashes plus a "late november 2026 · exact date soon" line while it isn't.
- **Next event.** Right under the countdown: date and place with the join button in the same row, three speaker slots, and snacks and drinks. Every open slot has a "call for speakers" link that opens a modal form (name, email, idea) which emails the organizer.
- **FAQ.** A vertical carousel of questions with the answer below.
- **Past events.** Collapsed by default, at the end. Opens to three photos from the previous meetup as an overlapping duotone collage; hover for full colour.
- **Footer.** Get in touch, and the colophon.
- **Theme toggle** (light/dark) and a page loader for slow connections.

## The event cycle

The next-event block carries the calls to action: the join button, and a "call for speakers" in every open slot (a full lineup means no open slots). Between events, swap `<NextEvent />` for `<StayUpToDate />` in `src/app/page.tsx`; it collects emails into Loops.

When a new event is confirmed, update:

1. `NEXT_EVENT` in `src/app/components/countdown.tsx`
2. The lu.ma link in `src/app/components/rsvp.tsx`
3. `WHEN`, `WHERE` and `SLOTS` in `src/app/components/next-event.tsx`
4. The date line in `src/app/components/poster.tsx`

When an event is over, add it to `src/app/components/past-events.tsx`. The FAQ has no event details, so it needs no edit.

## Speaker proposals

The form posts to `/api/propose`, which sends a Loops transactional email to the organizer inbox set in `src/app/api/propose/route.ts`.

One-time setup in Loops: create a transactional email with the data variables `name`, `email` and `proposal`, publish it, and put its ID in `LOOPS_PROPOSAL_TRANSACTIONAL_ID`. Until that's set, the form falls back to a pre-filled `mailto:` link so no proposal is lost.

The "→ keep me updated" link in the "might come next time?" answer (and the unmounted "stay up to date" form) posts to `/api/subscribe`. The route makes one Loops events call that adds the contact to the mailing list and fires a `signup` event. In Loops, create a Loop triggered by the `signup` event to send the welcome email, and set it to run once per contact.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript. Loading indicators from [loading-dev](https://loading.dev). Icons from Feather. Deployed on Vercel with Vercel Analytics.

## Extras

- `scripts/capture-shader.js` re-renders the wolf video through the halftone shader to an MP4 (needs `ffmpeg`).
- `docs/` holds standalone design write-ups made while building the site; they aren't part of the build.

## Colophon

Design references: [ÌníOlúwa Abíódún](https://www.iniabiodun.com/), [Dan Hollick](https://x.com/DanHollick/status/1978503090308304899), [Mitul Shah](https://github.com/mitul-s/mitul.ca).
