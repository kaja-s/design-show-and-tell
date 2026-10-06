"use client";

// Snapshots from the last meetup, placed after the CTA so the CTA stays close
// to the FAQ. Photos live in public/last-event/ and were taken from the
// organizer's portfolio case study.
//
// Layout: the page is a 576px column, so this is the one place content is
// allowed to bleed past it. On ≥ md the three photos are a collage inside a
// 16:10 stage that extends 96px past each side of the column. Each photo is
// a different crop (4:3, square, 3:2) and they overlap: the group shot sits
// over the bottom-right corner of the big one. Every frame has the same 1px
// stroke and nothing else, so the overlap is read from stacking alone. Hovering a photo
// lifts it to the top of the stack. Below md it's a horizontal scroller that
// bleeds to the viewport edges with the next photo peeking in.
//
// Treatment: duotone in the site's foreground colour (grayscale image under a
// blend-mode overlay), full colour on hover/focus. Overlay blend flips per
// theme so dark mode gets black/blue and light mode gets navy/white. The
// reveal uses a long, soft ease-out (700ms) so colour and tint arrive together.
//
// Interaction (≥ md only): photos can be dragged around the stage. Press and
// move to drag (pointer events, so mouse/pen/touch all work); the dragged
// photo jumps to the top of the stack and stays there. Arrow keys nudge a
// focused photo (shift = bigger steps). Photos aren't clamped: they can be
// taken anywhere on the page (html has overflow-x: clip so a photo past the
// viewport edge doesn't add a horizontal scrollbar). Positions aren't
// persisted, so a reload restores the original collage.
//
// Flip: double-click (or enter/space on a focused photo) turns a photo over
// to a plain back with its caption. Works in both layouts. Flipping the group
// photo (the last one) also fires a burst of halftone confetti from its centre.

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { burstConfetti } from "./confetti";

// TODO: captions — fill in who showed what once the lineup is confirmed.
const PHOTOS = [
  {
    src: "/last-event/photo-1.jpg",
    alt: "A speaker presenting to the room at a design show and tell",
    caption: "First design show&tell in june 2026 at Visionect! Full room.",
  },
  {
    src: "/last-event/photo-3.jpg",
    alt: "A talk in progress, the show and tell title card on screen",
    caption: "Informal presentations of work-in-progress.",
  },
  {
    src: "/last-event/photo-2.jpg",
    alt: "The group gathered together after a session",
    caption: "Group photo! Say cheese!",
  },
] as const;
const [DEMO, ROOM, GROUP] = PHOTOS;
const CONFETTI_INDEX = PHOTOS.indexOf(GROUP);

type Photo = (typeof PHOTOS)[number];

const LIFT = "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1";

// Movement below this many px counts as a click, not a drag.
const DRAG_THRESHOLD = 4;
const NUDGE = 8;
const NUDGE_BIG = 32;

type Offset = { x: number; y: number };
const ZERO: Offset = { x: 0, y: 0 };

function Frame({
  photo,
  aspect,
  sizes,
  priority = false,
  className = "",
}: {
  photo: Photo;
  aspect: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`group overflow-hidden bg-foreground border border-foreground/20 ${aspect} ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        width={2000}
        height={1500}
        sizes={sizes}
        priority={priority}
        draggable={false}
        className="h-full w-full object-cover grayscale contrast-105 transition-[filter,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:grayscale-0 group-focus-within:grayscale-0 group-hover:scale-[1.03]"
      />
      {/* duotone tint: lighten in light mode (blacks → navy), darken in dark mode (whites → blue) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-foreground mix-blend-lighten dark:mix-blend-darken transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-0 group-focus-within:opacity-0 pointer-events-none"
      />
    </div>
  );
}

// Frame on the front, caption on the back; rotates around the vertical axis.
function Flippable({
  photo,
  index,
  flipped,
  aspect,
  sizes,
  priority = false,
  frameClassName = "",
}: {
  photo: Photo;
  index: number;
  flipped: boolean;
  aspect: string;
  sizes: string;
  priority?: boolean;
  frameClassName?: string;
}) {
  return (
    <div className="[perspective:1200px]">
      <div
        className={`relative transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <Frame
          photo={photo}
          aspect={aspect}
          sizes={sizes}
          priority={priority}
          className={`relative [backface-visibility:hidden] ${frameClassName}`}
        />
        <div
          aria-hidden={!flipped}
          className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] border border-foreground/20 bg-background p-4 flex flex-col justify-between"
        >
          <p className="text-[10px] tracking-wider opacity-50">
            {index + 1}/{PHOTOS.length}
          </p>
          <p className="text-xs leading-relaxed">{photo.caption}</p>
        </div>
      </div>
    </div>
  );
}

// Base placement of each collage photo; drag offsets are added on top.
const COLLAGE = [
  { photo: DEMO, aspect: "aspect-[4/3]", sizes: "460px", priority: true, place: "left-0 top-0 w-[60%]" },
  { photo: ROOM, aspect: "aspect-square", sizes: "246px", priority: false, place: "right-0 top-[6%] w-[32%]" },
  { photo: GROUP, aspect: "aspect-[3/2]", sizes: "323px", priority: false, place: "left-[44%] top-[55%] w-[42%]" },
] as const;

export function LastEvent() {
  const [offsets, setOffsets] = useState<Offset[]>(() => COLLAGE.map(() => ZERO));
  // Stacking order, bottom → top, as indices into COLLAGE.
  const [order, setOrder] = useState<number[]>(() => COLLAGE.map((_, i) => i));
  const [dragging, setDragging] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>(() => PHOTOS.map(() => false));

  const flip = (index: number, el?: HTMLElement | null) => {
    setFlipped((prev) => {
      const out = prev.slice();
      out[index] = !out[index];
      return out;
    });
    if (index === CONFETTI_INDEX && el) {
      const r = el.getBoundingClientRect();
      burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
    }
  };
  const drag = useRef<{ index: number; pointerId: number; startX: number; startY: number; from: Offset; moved: boolean } | null>(null);

  const raise = useCallback((index: number) => {
    setOrder((prev) => (prev[prev.length - 1] === index ? prev : [...prev.filter((i) => i !== index), index]));
  }, []);

  const move = useCallback((index: number, next: Offset) => {
    setOffsets((prev) => {
      const out = prev.slice();
      out[index] = next;
      return out;
    });
  }, []);

  const onPointerDown = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { index, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, from: offsets[index], moved: false };
    raise(index);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(d.index);
    }
    move(d.index, { x: d.from.x + dx, y: d.from.y + dy });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      raise(index);
      flip(index, e.currentTarget);
      return;
    }
    const step = e.shiftKey ? NUDGE_BIG : NUDGE;
    const delta: Record<string, Offset> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    raise(index);
    const o = offsets[index];
    move(index, { x: o.x + d.x, y: o.y + d.y });
  };

  return (
    <section aria-labelledby="last-event-heading" className="mt-12 sm:mt-16">

      {/* ≥ md: collage on a 16:10 stage bleeding 96px past the column on each side.
          Each photo sits in a positioned handle that carries the drag offset and
          z-order; the Frame inside keeps its own hover lift. */}
      <div className="hidden md:block relative md:-mx-24 aspect-[16/10]">
        {COLLAGE.map((item, index) => {
          const o = offsets[index];
          const isDragging = dragging === index;
          return (
            <div
              key={item.photo.src}
              role="group"
              aria-label={`${item.photo.alt}. drag or use arrow keys to move; double-click or press enter to flip for the caption.`}
              tabIndex={0}
              onDoubleClick={(e) => flip(index, e.currentTarget)}
              onPointerDown={onPointerDown(index)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown(index)}
              onDragStart={(e) => e.preventDefault()}
              className={`absolute ${item.place} select-none touch-none outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{
                transform: `translate3d(${o.x}px, ${o.y}px, 0)`,
                zIndex: order.indexOf(index),
              }}
            >
              <Flippable
                photo={item.photo}
                index={index}
                flipped={flipped[index]}
                aspect={item.aspect}
                sizes={item.sizes}
                priority={item.priority}
                frameClassName={isDragging ? "shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)]" : LIFT}
              />
            </div>
          );
        })}
      </div>

      {/* < md: bleed to the viewport edges, next photo peeks ~20% */}
      <div className="md:hidden -mx-5 px-5 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PHOTOS.map((p, i) => (
          <div key={p.src} className="relative w-[80%] shrink-0 snap-start" onDoubleClick={(e) => flip(i, e.currentTarget)}>
            <Flippable photo={p} index={i} flipped={flipped[i]} aspect="aspect-[4/3]" sizes="80vw" priority={i === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}
