# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A single-page landing site for "design show & tell", a recurring in-person designer meetup (current venue: Visionect, Tržaška cesta 118). Deployed on Vercel at https://design-show-and-tell.vercel.app. Next.js 16 (App Router), React 19, Tailwind v4, TypeScript. There is one route (`/`) and one API route (`/api/subscribe`). No tests exist.

## Commands

```bash
npm run dev      # dev server on http://localhost:3000
npm run build    # production build (also the type-check: tsconfig has noEmit)
npm run lint     # eslint (eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit # type-check without building
node scripts/capture-shader.js  # re-render public/wolf.mp4 through the halftone shader → wolf-shader.mp4 (needs ffmpeg on PATH)
node graphics/_engine/render.js <name>  # render a looping social motion graphic → graphics/<name>/<file>.mp4 (needs Google Chrome + ffmpeg; see graphics/README.md)
```

`LOOPS_API_KEY` must be set in `.env.local` for the subscribe form to work locally. Without it the API route returns 500.

## Motion graphics (`graphics/`)

`graphics/_engine/comp.html` is one shared composition (WebGL port of the halftone shader + DOM typography + a scripted pointer that clicks the theme toggle; every frame is a pure function of time, and it loops). Each graphic is a folder with a `content.js` that supplies copy, duration, wolf framing and timeline overrides; `graphics/_engine/render.js <name>` drives it through headless Chrome into ffmpeg. `graphics/README.md` has the details.

## Event cycle: the one recurring edit

The site alternates between two states, and most changes to this repo are flipping between them. When a new event is announced, update all of these together:

1. `src/app/components/countdown.tsx` – `NEXT_EVENT` date (local time, no timezone suffix). Between events set it to `null`: the slot then shows the `SAVE_THE_DATE` line ("late november 2026 · exact date soon") instead of a zeroed countdown. Either way the loading dashes resolve into the content over 400ms (`cd-*` block in `globals.css`). The slot glitches every 5s (`GLITCH = "slip"` in countdown.tsx; the `cdg-*` block in `globals.css` also holds the unused slice/flicker/jitter variants).
2. `src/app/components/faq.tsx` – the "when + where?" entry in `faqs` (answers are `ReactNode`, so links go inline in the array).
3. `src/app/components/rsvp.tsx` – the lu.ma `href`.
4. `src/app/page.tsx` – pick the CTA for the phase: `<SpeakerProposal />` while looking for speakers, `<StayUpToDate />` between events once the lineup is full, `<Rsvp />` once the lu.ma page is live. The other two imports are commented out there.

## Architecture notes

**Everything is client-rendered.** `page.tsx` and every component are `"use client"`. `page.tsx` has two folds: a `sm:min-h-screen` hero section (toggle, wolf, countdown, FAQ, CTA) and the last-event photos below it, so the photos only appear on scroll. The only server code is `src/app/layout.tsx` (metadata/OG tags, font, providers) and the API route.

**Theme and case mode are html-attribute driven.** `layout.tsx` injects an inline `<script>` in `<head>` that reads `localStorage` and sets `.dark` on `<html>` and `data-case="lower"|"typed"` before React hydrates, to avoid a flash. `ThemeProvider` / `CaseProvider` (in `src/app/`) then mirror that state into React context and keep `localStorage` in sync. Colors are CSS variables in `globals.css` (`:root` and `:root.dark`) exposed to Tailwind through `@theme inline` as `bg-background`, `text-foreground`, `bg-highlight`, `text-highlight-text`, etc. Use those tokens rather than raw hex in components. `data-case="lower"` applies `text-transform: lowercase` globally to text elements, which is why copy is written in lowercase and why the "typed" mode exists; there is currently no UI toggle for case mode (`useCase` is unused).

**The theme colors are duplicated in the shader.** `shader-canvas.tsx` renders `public/wolf.mp4` through a WebGL halftone fragment shader and hardcodes the foreground hex for each theme (`#021093` light, `#93c5fd` dark). `scripts/capture-shader.js` is a CPU re-implementation of the same shader used to export a standalone video; its constants (dot size, angle, colors) must be kept in sync with the GLSL by hand. If you change `--foreground` in `globals.css`, update both.

**The "paint" button is copy-pasted, not shared.** `rsvp.tsx` (an `<a>`) and the `PaintButton` inside `stay-up-to-date.tsx` (a `<button>`) contain the same hover-paint grid logic. The hover color `#93c5fd` is hardcoded in both.

**FAQ is a vertical Embla carousel** (`src/components/ui/carousel.tsx`, shadcn wrapper) with two trailing empty `CarouselItem` spacers so the last question can center. Blur/opacity of items is computed from distance to the selected index. The transition timing comes from the `carousel-anim-N` classes in `globals.css`.

**Subscribe flow:** `StayUpToDate` (unmounted) and the inline `KeepMeUpdated` link in the "when + where?" FAQ answer post `{name?, email}` to `/api/subscribe`. The route makes one Loops `events/send` call: it creates or updates the contact, adds it to the hardcoded mailing list ID, and fires the `signup` event. A Loop in the Loops dashboard triggered by `signup` sends the welcome email; set it to run once per contact.

**Last-event photos:** `last-event.tsx` renders three photos from `public/last-event/` (copied from the organizer's portfolio case study) as an overlapping collage on a 16:10 stage at `md` and up, and as a horizontal snap scroller below. It is the only content allowed to bleed past the 576px column (negative horizontal margins). The duotone comes from a grayscale image under a `bg-foreground` overlay using `mix-blend-lighten` in light mode and `dark:mix-blend-darken`; `globals.css` defines `@custom-variant dark` so Tailwind's `dark:` follows the `.dark` class rather than the OS. The frame's base classes deliberately omit `relative` so callers can pass `absolute`.

**Forms:** all forms use `form-field.tsx` (`FieldLabel`, `FieldError`, `FIELD_CLASS`, `EMAIL_RE`, `focusFirstInvalid`). Fields have visible labels, format placeholders, `aria-describedby` pointing at an always-rendered error slot, and `aria-invalid` set from on-submit validation (`noValidate` on the form); focus moves to the first invalid field. Errors use the `--color-danger` token. `suggestEmail` catches likely domain typos (`gmial.com`) against a list of common providers by edit distance; the first send shows `EmailSuggestion` ("did you mean …?", one-click fix) and marks the field invalid, a second send with the same address goes through. Keyboard focus everywhere is a 2px `:focus-visible` outline defined in `globals.css`; never add `outline: none`.

**Speaker proposals:** `SpeakerProposal` is a native `<dialog>` (showModal) portalled to `<body>`; while open it sets `data-proposal-open` on `<body>`, and `globals.css` blurs `main`, `footer` and the corner card off that attribute (the bundler drops unprefixed `backdrop-filter` on `::backdrop`, so the page is blurred instead of the backdrop). Tailwind preflight zeroes `margin`, so `.proposal-dialog` restores `margin: auto` for centering. The form posts `{name, email, proposal}` to `/api/propose`, which sends a Loops transactional email to the organizer inbox hardcoded in that route. It needs `LOOPS_PROPOSAL_TRANSACTIONAL_ID` (a published Loops transactional template with `name`, `email`, `proposal` data variables). If `LOOPS_PROPOSAL_CONFIRMATION_TRANSACTIONAL_ID` is also set (template with `name`, `proposal`), the proposer gets a confirmation email; that send is best effort and never fails the request. Without it the route returns 503 with `fallback: "mailto"` and the form shows a pre-filled mailto link. `PaintButton` is shared from `paint-button.tsx`. The success state is signed "— kaja"; hovering, focusing or tapping the name reveals `public/kaja.jpg` as a growing halftone (`.sig-photo` in `globals.css`: a dot-grid `mask-image` whose radius is a registered `@property` so it can transition; it only plays forward, exit is a plain fade) followed by a "hi from stockholm!" note.

**Loading states.** `loading-dev` (React 19, SVG + CSS keyframes, inherits `currentColor`) supplies the `<Arc />` in the signup/proposal buttons, and the `<Blocks />` in `page-loader.tsx`. The page loader is mounted in `layout.tsx` so it is in the server HTML; it stays invisible for 400ms (fast loads never see it), fades in on slow loads, and leaves on the window `load` event or after a 4s cap; once visible it stays at least 2s, then fades from its current opacity so it can't flash. `docs/*.html` are standalone design write-ups, not part of the build.

**Dev server gotcha.** Turbopack has been seen serving a stale `globals.css` after appends; if a style change seems ignored, save the file again (a `touch` is enough) and hard-reload.

**Easter eggs.** `console-wolf.tsx` logs an ASCII halftone wolf plus the speaker ask to the devtools console once per load. `poster.tsx` + the `@media print` block at the end of `globals.css` turn cmd+p into a one-sheet A4 save-the-date poster (always navy on white; its copy mirrors the countdown and FAQ, so update it with the event cycle; QR is `public/qr.svg`, regenerate with `npx qrcode -t svg -o public/qr.svg -m 0 -d 021093ff -l ffffff00 <url>`). Both read `wolf-dots.ts`, a 50×60 ink grid sampled from frame 0 of `wolf.mp4` by `scripts/wolf-dots.py` (see its docstring for the ffmpeg step). `countdown.tsx` also swaps the tab title to the slot's days + hours while the tab is hidden and glitches it once on return. In `last-event.tsx`, double-click (or enter) flips a photo to its caption, and on ≥ md photos can be dragged anywhere.

**Lint baseline:** `npm run lint` reports 10 pre-existing errors on main (`react-hooks/set-state-in-effect` in the providers/countdown/faq/carousel, `require()` in the capture script, unescaped quotes in stay-up-to-date). Don't treat them as regressions.

**Unused but kept:** `src/app/components/last-visitor.tsx` (ipapi.co geolocation, localStorage-based "last visitor from …") and `src/components/ui/button.tsx` (shadcn) are not imported anywhere.

## Conventions

- Site copy is lowercase; keep new text lowercase (the CSS lowercases most elements anyway, but not inputs/placeholders).
- Icons come from `feather-icons-react` (`<FeatherIcon icon="moon" />`). `lucide-react` is installed only because the shadcn carousel imports it.
- Path alias: `@/` → `src/`. shadcn config (`components.json`) uses the `new-york` style with `rsc: false`.
- Fonts: Geist Mono via `next/font/google`, exposed as `--font-geist-mono`; the countdown deliberately uses system `Monaco`.
