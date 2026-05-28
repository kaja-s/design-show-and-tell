"use client";

import { useTheme } from "./theme-provider";
import { Countdown } from "./components/countdown";
import { Faq } from "./components/faq";
import { Rsvp } from "./components/rsvp";
import { ShaderCanvas } from "./components/shader-canvas";
import FeatherIcon from "feather-icons-react";

export default function Home() {
  const { theme, toggle } = useTheme();
  
  return (
    <>
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'url(/noise.svg)',
          backgroundRepeat: 'repeat',
          zIndex: 9999,
        }}
      />

      <main className="flex-1 flex flex-col items-center px-5 py-10 sm:py-20 relative z-10">
        <div className="w-full max-w-xl">
          <div className="flex justify-end mb-10">
            <button
              onClick={toggle}
              className="opacity-40 hover:opacity-100 transition-opacity px-2 py-1"
              aria-label="Toggle theme"
            >
              <FeatherIcon icon={theme === "light" ? "moon" : "sun"} size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-col items-center mb-8 sm:mb-12">
            <ShaderCanvas />
            <h1 className="text-sm font-bold lowercase">design show & tell</h1>
          </div>

          <Countdown />
          <Faq />
          <Rsvp />
        </div>
      </main>
      <footer className="pb-6 px-5 text-center">
        <p className="text-xs lowercase opacity-40">
          created by{" "}
          <a
            href="https://kajaskerlj.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            kajaskerlj.com
          </a>
        </p>
      </footer>
    </>
  );
}
