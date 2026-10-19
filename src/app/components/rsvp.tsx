"use client";

// The RSVP button used during an active event cycle: links to the event's
// lu.ma page. Update the `href` below with each new event.

import { PaintButton } from "./paint-button";

export function Rsvp() {
  return (
    <section className="flex justify-center">
      <PaintButton href="https://luma.com/gr4iamtz">sign up</PaintButton>
    </section>
  );
}
