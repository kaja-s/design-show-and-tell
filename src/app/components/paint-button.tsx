"use client";

// The site's primary button: a flat highlight block whose hover paints a
// 14×4 grid of squares under the cursor. Shared by the signup form and the
// speaker proposal form.

import { useState, useRef } from "react";

const PAINT_COLS = 14;
const PAINT_ROWS = 4;

export function PaintButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  const [painted, setPainted] = useState<Set<number>>(new Set());
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * PAINT_COLS);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * PAINT_ROWS);
    if (col < 0 || col >= PAINT_COLS || row < 0 || row >= PAINT_ROWS) return;
    const idx = row * PAINT_COLS + col;
    setPainted((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const handleMouseLeave = () => setPainted(new Set());

  const squares = Array.from({ length: PAINT_COLS * PAINT_ROWS }, (_, i) => i);

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative overflow-hidden px-4 py-2 bg-highlight text-highlight-text text-sm font-medium whitespace-nowrap transition-[transform,opacity] duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${PAINT_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${PAINT_ROWS}, 1fr)`,
        }}
      >
        {squares.map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: "#93c5fd",
              opacity: painted.has(i) ? 0.55 : 0,
              transition: "opacity 0.08s ease",
            }}
          />
        ))}
      </div>
      <span className="relative z-10">{children}</span>
    </button>
  );
}
