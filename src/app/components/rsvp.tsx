"use client";

// The join button used during an active event cycle: links to the event's
// lu.ma page. It sits in the date row of the next-event block (next-event.tsx).
// Update the `href` below with each new event.

import { PaintButton } from "./paint-button";

export function Rsvp() {
  return <PaintButton href="https://luma.com/gr4iamtz">join</PaintButton>;
}
