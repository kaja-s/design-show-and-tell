"use client";

// Small call-for-speakers card pinned to the bottom-right corner.
// Appears after a short delay, remembers dismissal for DISMISS_DAYS, and
// respects prefers-reduced-motion. Keyframes live in globals.css (cfs-*).
//
// Hovering (or focusing) "propose a demo", or clicking the "call for speakers"
// label, unfolds a message field above the button;
// whatever is typed becomes the body of the mailto so the proposal arrives
// in the organizers' inbox with the first click.

import { useEffect, useRef, useState } from "react";
import FeatherIcon from "feather-icons-react";
import { Arc } from "loading-dev";

const SPEAKER_EMAIL = "kaja.skerlj@gmail.com";
const SPEAKER_SUBJECT = "design show & tell — demo proposal";
const MESSAGE_MAX = 600;

function speakerHref(message: string) {
  const params = new URLSearchParams({ subject: SPEAKER_SUBJECT });
  const body = message.trim();
  if (body) params.set("body", body);
  // URLSearchParams encodes spaces as "+", which mail clients render literally.
  return `mailto:${SPEAKER_EMAIL}?${params.toString().replace(/\+/g, "%20")}`;
}
const APPEAR_DELAY_MS = 1400;
const DISMISS_DAYS = 7;
const STORAGE_KEY = "cfsDismissedAt";

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ageMs = Date.now() - Number(raw);
    return ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function CallForSpeakers() {
  // "hidden" → not in the DOM. "in" → entering/idle. "out" → exit animation running.
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  // The message field stays open once revealed so people can move the pointer
  // from the button into the field without it folding back up.
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (wasDismissedRecently()) return;
    const t = setTimeout(() => setPhase("in"), APPEAR_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setPhase("out");
  };

  // Unmount once the exit animation finishes (fallback timer in case the
  // animationend event never fires, e.g. reduced motion with 0ms animations).
  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("hidden"), 450);
    return () => clearTimeout(t);
  }, [phase]);

  const openField = () => setComposing(true);

  if (phase === "hidden") return null;

  return (
    <div
      ref={cardRef}
      role="complementary"
      aria-label="Call for speakers"
      data-phase={phase}
      className="cfs-card fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[300px] border border-foreground/20 hover:border-foreground/60 bg-background/90 backdrop-blur-sm p-4 transition-[border-color,transform] duration-300 ease-out hover:-translate-y-0.5"
      onAnimationEnd={(e) => {
        if (phase === "out" && e.target === cardRef.current) setPhase("hidden");
      }}
    >
      {/* Header row: spinner + label + close. The spinner says "lineup in progress". */}
      <div className="cfs-child flex items-center gap-2 mb-3" style={{ "--i": 0 } as React.CSSProperties}>
        <span className="shrink-0 opacity-70 flex" aria-hidden="true">
          <Arc size={12} />
        </span>
        <button
          type="button"
          onClick={openField}
          className="text-[10px] tracking-wider opacity-50 hover:opacity-100 transition-opacity flex-1 text-left"
        >
          call for speakers
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="close"
          className="-mr-1 -mt-1 p-1 opacity-40 hover:opacity-100 hover:rotate-90 transition-[opacity,transform] duration-300 ease-out"
        >
          <FeatherIcon icon="x" size={14} strokeWidth={1.5} />
        </button>
      </div>

      <p className="cfs-child text-base font-bold leading-snug text-foreground mb-1.5" style={{ "--i": 1 } as React.CSSProperties}>
        demo something in november
      </p>
      <p className="cfs-child text-xs leading-relaxed text-foreground-muted mb-4" style={{ "--i": 2 } as React.CSSProperties}>
        5–10 minutes, live, no slides. finished or not.
      </p>

      {/* Message field: folded until "i'm in" is hovered or focused. Lives above
          the button so the button doesn't move under the pointer when it opens. */}
      <div
        className="cfs-field"
        data-open={composing ? "true" : "false"}
        aria-hidden={!composing}
        onTransitionEnd={(e) => {
          if (composing && e.propertyName === "grid-template-rows") fieldRef.current?.focus({ preventScroll: true });
        }}
      >
        <div>
          <label htmlFor="cfs-message" className="block text-xs font-medium text-foreground-muted mb-2">
            what would you show?
          </label>
          <textarea
            ref={fieldRef}
            id="cfs-message"
            name="message"
            rows={3}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            tabIndex={composing ? 0 : -1}
            placeholder="e.g. a figma plugin, half done"
            className="w-full px-3 py-2 text-xs leading-relaxed bg-transparent border border-foreground/20 focus:border-foreground/60 placeholder:text-foreground/40 resize-none"
          />
        </div>
      </div>

      <div className="cfs-child flex items-center gap-3" style={{ "--i": 3 } as React.CSSProperties}>
        <a
          href={speakerHref(message)}
          onMouseEnter={openField}
          onFocus={openField}
          className="cfs-cta group relative inline-flex items-center gap-1.5 px-3 py-1.5 bg-highlight text-highlight-text text-xs font-medium overflow-hidden"
        >
          <span className="relative z-10">{composing && message.trim() ? "send proposal" : "propose a demo"}</span>
          <span className="cfs-arrow relative z-10 inline-flex" aria-hidden="true">
            <FeatherIcon icon="arrow-right" size={12} strokeWidth={2} />
          </span>
          {/* sweep highlight on hover */}
          <span className="cfs-sweep absolute inset-y-0 -left-full w-full bg-white/25 pointer-events-none" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs opacity-40 hover:opacity-100 transition-opacity"
        >
          not now
        </button>
      </div>
    </div>
  );
}
