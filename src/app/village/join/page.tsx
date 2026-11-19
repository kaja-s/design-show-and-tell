import type { Metadata, Viewport } from "next";
import { JoinFlow } from "./join-flow";

export const metadata: Metadata = { title: "move into the village · design show & tell" };

// Opened from the slide's qr code, so this page is phone-first:
// paint under the notch (main pads back with safe-area insets), let the
// android keyboard shrink the layout so the bottom button stays above it,
// and tint the status bar to the top of the page background. Always light
// (layout.tsx skips .dark here; JoinFlow removes it on client navigation).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#f4f4f4",
  colorScheme: "light",
};

export default function JoinPage() {
  return <JoinFlow />;
}
