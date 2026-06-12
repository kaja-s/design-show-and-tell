"use client";

import { useTheme } from "./theme-provider";
import { Countdown } from "./components/countdown";
import { Faq } from "./components/faq";
import { StayUpToDate } from "./components/stay-up-to-date";
// For the next event: uncomment the Rsvp import + usage below and comment out StayUpToDate.
// import { Rsvp } from "./components/rsvp";
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

      <main className="sm:min-h-screen flex flex-col items-center justify-center px-5 pt-6 sm:pt-8 pb-12 sm:pb-20 relative z-10">
        <div className="w-full max-w-xl">
          <div className="flex justify-end mb-6 sm:mb-10">
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
          {/* Between events: collect signups. For the next event, swap to <Rsvp /> below. */}
          <StayUpToDate />
          {/* <Rsvp /> */}
        </div>
      </main>

      <footer className="pb-6 px-5 text-center space-y-3">
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
