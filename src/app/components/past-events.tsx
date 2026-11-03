"use client";

// Past events, last on the page and collapsed by default. The photos mount the
// first time it's opened, so a visitor who never opens it never downloads them.
// When the next event is over, add it here as a second entry.

import { useId, useState } from "react";
import FeatherIcon from "feather-icons-react";
import { LastEvent } from "./last-event";

export function PastEvents() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const panelId = useId();

  const toggle = () => {
    setOpen((v) => !v);
    setEverOpened(true);
  };

  return (
    <section>
      <h2 className="text-sm">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 border-y border-foreground/20 py-4 text-left transition-colors duration-150 hover:bg-foreground/5"
        >
          <span className="flex items-baseline gap-3">
            <span className="font-bold">past events</span>
            <span className="text-[10px] tracking-wider opacity-50">1</span>
          </span>
          <FeatherIcon
            icon="chevron-down"
            size={16}
            strokeWidth={2}
            className={`transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>

      <div id={panelId} hidden={!open} className="animate-fade-in">
        {everOpened && (
          <div className="pt-6">
            <p className="text-sm">
              <span className="font-bold">jun 2026</span> <span className="opacity-60">· visionect</span>
            </p>
            <p className="text-sm opacity-60">first design show &amp; tell. full room.</p>
            <LastEvent />
          </div>
        )}
      </div>
    </section>
  );
}
