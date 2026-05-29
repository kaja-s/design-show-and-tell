"use client";

import { useEffect, useState } from "react";

const NEXT_EVENT = new Date("2026-06-11T18:00:00");

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
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    setTime(getTimeLeft(NEXT_EVENT));
    const interval = setInterval(() => {
      setTime(getTimeLeft(NEXT_EVENT));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <section className="mb-8 sm:mb-12">
        <div className="flex justify-center">
          <span className="font-['Monaco',monospace] text-lg sm:text-xl uppercase">
            --D : --H : --M : --S
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 sm:mb-12">
      <div className="flex justify-center">
        <span className="font-['Monaco',monospace] text-lg sm:text-xl uppercase">
          {pad(time.days)}D : {pad(time.hours)}H : {pad(time.minutes)}M : {pad(time.seconds)}S
        </span>
      </div>
    </section>
  );
}
