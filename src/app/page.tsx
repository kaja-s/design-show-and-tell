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

      {/* Fixed theme toggle - top right */}
      <div className="fixed top-6 left-0 right-0 z-50 px-5 flex justify-center pointer-events-none">
        <div className="w-full max-w-xl flex justify-end pointer-events-auto">
          <button
            onClick={toggle}
            className="opacity-40 hover:opacity-100 transition-opacity px-2 py-1"
            aria-label="Toggle theme"
          >
            <FeatherIcon icon={theme === "light" ? "moon" : "sun"} size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-20 relative z-10">
        <div className="w-full max-w-xl">
          <div className="flex flex-col items-center mb-8 sm:mb-12">
            <ShaderCanvas />
            <h1 className="text-sm font-bold lowercase">design show & tell</h1>
          </div>

          <Countdown />
          <Faq />
          <Rsvp />
        </div>
      </main>

      {/* Fixed colophon - bottom center */}
      <footer className="fixed bottom-6 left-0 right-0 text-center z-50">
        <p className="text-xs opacity-40">
          colophon:{" "}
          <a
            href="https://www.iniabiodun.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-100 transition-opacity"
          >
            ÌníOlúwa Abíódún
          </a>
          ,{" "}
          <a
            href="https://x.com/DanHollick/status/1978503090308304899"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-100 transition-opacity"
          >
            Dan Hollick
          </a>
          , and{" "}
          <a
            href="https://github.com/mitul-s/mitul.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-100 transition-opacity"
          >
            Mitul Shah
          </a>
        </p>
      </footer>
    </>
  );
}
