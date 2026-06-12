"use client";

import { useState, useRef } from "react";

const PAINT_COLS = 14;
const PAINT_ROWS = 4;

function PaintButton({
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
      className="group relative overflow-hidden px-4 py-2 bg-highlight text-highlight-text text-sm font-medium whitespace-nowrap transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
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

export function StayUpToDate() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "You're on the list.");
        setName("");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (!open) {
    return (
      <section className="flex justify-center">
        <PaintButton onClick={() => setOpen(true)}>stay up to date</PaintButton>
      </section>
    );
  }

  if (status === "success") {
    return (
      <section className="flex flex-col items-center gap-2 animate-fade-in">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs opacity-50">reply back with a "Hi!" :)</p>
      </section>
    );
  }

  return (
    <section className="flex justify-center animate-fade-in">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <p className="text-sm opacity-60 text-center">
          stay up to date on the next event by entering your name and email.
        </p>
        <input
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="name"
          required
          disabled={status === "loading"}
          className="w-full px-3 py-2 text-sm bg-transparent border border-foreground/20 placeholder:text-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === "loading"}
          className="w-full px-3 py-2 text-sm bg-transparent border border-foreground/20 placeholder:text-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        <div className="flex justify-center">
          <PaintButton type="submit" disabled={status === "loading"}>
            {status === "loading" ? "..." : "stay up to date"}
          </PaintButton>
        </div>
        {message && status === "error" && (
          <p className="text-xs text-center" style={{ color: "#ef4444" }}>
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
