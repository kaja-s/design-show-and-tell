"use client";

import { useTheme } from "./theme-provider";
import { Countdown } from "./components/countdown";
import { NextEvent } from "./components/next-event";
import { Faq } from "./components/faq";
import { PastEvents } from "./components/past-events";
import { SiteFooter } from "./components/site-footer";
// The CTAs live in <NextEvent />: join in the date row, call for speakers in
// each open slot (they all open the one <SpeakerProposal /> dialog). Between
// events, swap <NextEvent /> for <StayUpToDate />.
import { SpeakerProposal } from "./components/speaker-proposal";
// import { StayUpToDate } from "./components/stay-up-to-date";
import { ShaderCanvas } from "./components/shader-canvas";
import { ConsoleWolf } from "./components/console-wolf";
import { Poster } from "./components/poster";
import FeatherIcon from "feather-icons-react";

export default function Home() {
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Noise overlay */}
      <div
        className="noise fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'url(/noise.svg)',
          backgroundRepeat: 'repeat',
          zIndex: 9999,
        }}
      />

      <main className="flex flex-col items-center px-5 relative z-10">
        {/* Top: wolf, countdown and the next event (date + join, speaker slots). */}
        <div className="w-full max-w-xl pt-6 sm:pt-8">
          <div className="flex justify-end mb-6 sm:mb-10">
            {/* Names the action and exposes the current state: "dark theme", pressed/not pressed. */}
            <button
              type="button"
              onClick={toggle}
              aria-pressed={theme === "dark"}
              aria-label="Dark theme"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="opacity-40 hover:opacity-100 active:scale-[0.96] transition-[opacity,scale] duration-150 ease-out p-[11px] -m-[11px]"
            >
              {/* Both icons stay mounted and turn through each other: the outgoing one
                  rotates on and away while the incoming one rotates in from behind, so a
                  switch reads as one clockwise quarter turn. Transitions, so a second
                  click mid-turn reverses from where it is. Reduced motion: fade only. */}
              <span className="relative block size-[18px]" aria-hidden="true">
                {(["moon", "sun"] as const).map((icon) => (
                  <FeatherIcon
                    key={icon}
                    icon={icon}
                    size={18}
                    strokeWidth={1.5}
                    className={`theme-icon absolute inset-0 transition-[opacity,scale,rotate,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:scale-100 motion-reduce:rotate-0 ${
                      (icon === "moon") === (theme === "light")
                        ? "opacity-100 scale-100 rotate-0 blur-0"
                        : `opacity-0 scale-[0.25] blur-[4px] ${icon === "moon" ? "rotate-90" : "-rotate-90"}`
                    }`}
                  />
                ))}
              </span>
            </button>
          </div>

          <div className="flex flex-col items-center mb-8 sm:mb-12">
            <ShaderCanvas />
            <h1 className="text-sm font-bold lowercase">design show & tell</h1>
          </div>

          <Countdown />
          <NextEvent />
          {/* <StayUpToDate /> */}
        </div>

        {/* Below: the faq, then past events (collapsed). */}
        <div className="w-full max-w-xl pb-12 sm:pb-16">
          <Faq />
          <PastEvents />
        </div>
      </main>

      <SiteFooter />
      <SpeakerProposal />

      {/* easter eggs: devtools console wolf, and the print-only poster (cmd+p) */}
      <ConsoleWolf />
      <Poster />
    </>
  );
}
