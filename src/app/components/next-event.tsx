"use client";

// The next event, directly under the countdown: when + where with the join
// button in the same row, the speaker slots, then snacks and drinks. Each open
// slot carries its own "call for speakers" (they all open the one dialog
// mounted in page.tsx).
//
// Per event: edit WHEN, WHERE and SLOTS below, the date in countdown.tsx and
// the lu.ma link in rsvp.tsx. A slot is a speaker, or null while it's open.

import { Rsvp } from "./rsvp";
import { CallForSpeakers } from "./speaker-proposal";

const WHEN = "november 19th, 2026 · 6pm";
const WHERE = "visionect, tržaška cesta 118, ljubljana";

type Speaker = { name: string; href?: string; role: string; talk: string };

const SLOTS: (Speaker | null)[] = [
  {
    name: "nika vižintin prinz",
    href: "https://www.linkedin.com/in/nikavizintin/",
    role: "product designer at aikido",
    talk: "every process i've worked in, and why i'm back to just designing",
  },
  null,
  null,
];

const LABEL = "text-[10px] tracking-wider opacity-50";

export function NextEvent() {
  return (
    <section className="mb-12 sm:mb-16">
      <h2 className="sr-only">next event</h2>

      <div className="flex flex-col gap-4 border-t border-foreground/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="mb-2 inline-block border border-foreground/40 px-1.5 py-1 text-[10px] leading-none tracking-wider">
            next
          </span>
          <p className="text-sm font-bold">{WHEN}</p>
          <p className="text-sm opacity-60">{WHERE}</p>
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <Rsvp />
        </div>
      </div>

      <h3 className={`${LABEL} mt-8 mb-3`}>lineup</h3>
      <ol className="space-y-2">
        {SLOTS.map((slot, i) => (
          <li
            key={i}
            className={`grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 border border-foreground/20 p-4 ${slot ? "" : "border-dashed"}`}
          >
            <span aria-hidden="true" className={`${LABEL} mt-[3px]`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            {slot ? (
              <div>
                <p className="text-sm font-bold">
                  {slot.href ? (
                    <a
                      href={slot.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-70 transition-opacity"
                    >
                      {slot.name}
                    </a>
                  ) : (
                    slot.name
                  )}
                </p>
                <p className="text-sm opacity-60">{slot.role}</p>
                <p className="mt-2 text-xs opacity-60">“{slot.talk}”</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div>
                  <p className="text-sm opacity-60">open slot</p>
                  <p className="text-xs opacity-60">ten minutes, live, no slides.</p>
                </div>
                <CallForSpeakers />
              </div>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-4 px-[17px] text-sm opacity-60">
        <span aria-hidden="true" className="mr-3">+</span>
        snacks and drinks
      </p>
    </section>
  );
}
