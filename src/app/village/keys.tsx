"use client";

// How to play the village, shown under it. Its own module so the homepage can
// render it without pulling in the engine.
import { useEffect, useState } from "react";

export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(pointer: coarse)");
    const on = () => setCoarse(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return coarse;
}

const KBD = "inline-grid place-items-center min-w-5 h-5 px-1 border border-current/30 text-[10px] leading-none";

export function Keys({ touch, className = "" }: { touch: boolean; className?: string }) {
  const items: [React.ReactNode, string][] = touch
    ? [
        [<span key="t" className={KBD}>tap</span>, "walk there"],
        [<span key="d" className={KBD}>drag</span>, "walk that way"],
        [<span key="p" className={KBD}>tap someone</span>, "say hi"],
      ]
    : [
        [
          <span key="a" className="inline-flex gap-0.5">
            <span className={KBD}>↑</span>
            <span className={KBD}>↓</span>
            <span className={KBD}>←</span>
            <span className={KBD}>→</span>
          </span>,
          "walk",
        ],
        [<span key="e" className={KBD}>enter</span>, "talk"],
        [<span key="x" className={KBD}>esc</span>, "close"],
        [<span key="c" className={KBD}>click</span>, "go there"],
      ];
  return (
    <ul className={`flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[11px] ${className}`} aria-label="controls">
      {items.map(([k, label]) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          {k}
          <span className="opacity-70">{label}</span>
        </li>
      ))}
    </ul>
  );
}
