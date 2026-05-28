"use client";

import { useState } from "react";

const faqs = [
  {
    q: "what is design show & tell?",
    a: "a casual gathering where designers share recent work, get feedback, and learn from each other. think of it as a crit session without the pressure.",
  },
  {
    q: "who should attend?",
    a: "anyone who works in or adjacent to design — product designers, brand designers, engineers with a design eye, design students, illustrators, or anyone curious about the craft.",
  },
  {
    q: "do i need to present?",
    a: "no. you're welcome to just listen and participate in feedback. presenting is optional and always low-stakes.",
  },
  {
    q: "what can i show?",
    a: "anything — a side project, a work-in-progress, a case study, a tool you've been exploring, or a design challenge you're stuck on.",
  },
  {
    q: "how long are presentations?",
    a: "5–10 minutes each, followed by a few minutes of group feedback. we keep it tight and informal.",
  },
];

export function Faq() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c + 1) % faqs.length);
  const prev = () => setCurrent((c) => (c - 1 + faqs.length) % faqs.length);

  return (
    <section className="mb-16 sm:mb-24">
      <p className="text-xs lowercase opacity-50 mb-6 text-center">faq</p>
      <div className="flex flex-col items-center">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm font-bold lowercase">{faqs[current].q}</p>
          <p className="text-sm lowercase opacity-70 leading-relaxed">
            {faqs[current].a}
          </p>
        </div>
        <div className="flex gap-4 mt-6 items-center">
          <button
            onClick={prev}
            className="text-xs lowercase px-3 py-1 border border-foreground/20 hover:bg-highlight hover:text-highlight-text transition-colors"
          >
            ←
          </button>
          <span className="text-xs opacity-50">
            {current + 1} / {faqs.length}
          </span>
          <button
            onClick={next}
            className="text-xs lowercase px-3 py-1 border border-foreground/20 hover:bg-highlight hover:text-highlight-text transition-colors"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
