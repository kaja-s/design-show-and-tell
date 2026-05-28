"use client";

import { useEffect, useState } from "react";

const NEXT_EVENT = new Date("2026-06-12T18:00:00");

function getTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function Countdown() {
  const [time, setTime] = useState(getTimeLeft(NEXT_EVENT));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeLeft(NEXT_EVENT));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mb-16 sm:mb-24">
      <p className="text-xs lowercase opacity-50 mb-4">next event</p>
      <p className="text-xs lowercase opacity-70 mb-6">
        june 12, 2026 — 6:00 pm
      </p>
      <div className="flex gap-6 sm:gap-10">
        <Unit value={pad(time.days)} label="days" />
        <Unit value={pad(time.hours)} label="hrs" />
        <Unit value={pad(time.minutes)} label="min" />
        <Unit value={pad(time.seconds)} label="sec" />
      </div>
    </section>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-5xl font-bold tabular-nums">{value}</span>
      <span className="text-xs opacity-50 mt-1 lowercase">{label}</span>
    </div>
  );
}
