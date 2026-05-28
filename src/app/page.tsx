"use client";

import { useTheme } from "./theme-provider";
import { Countdown } from "./components/countdown";
import { Faq } from "./components/faq";
import { Rsvp } from "./components/rsvp";
import { ShaderCanvas } from "./components/shader-canvas";

export default function Home() {
  const { theme, toggle } = useTheme();

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-10 sm:py-20">
      <div className="w-full max-w-xl">
        <header className="flex items-center justify-between mb-16 sm:mb-24">
          <h1 className="text-sm font-bold lowercase">design show & tell</h1>
          <button
            onClick={toggle}
            className="text-xs lowercase px-2 py-1 border border-foreground/20 hover:bg-highlight hover:text-highlight-text transition-colors"
          >
            {theme === "light" ? "dark" : "light"}
          </button>
        </header>

        <div className="flex justify-center mb-16 sm:mb-24">
          <ShaderCanvas />
        </div>

        <Countdown />
        <Faq />
        <Rsvp />
      </div>
    </main>
  );
}
