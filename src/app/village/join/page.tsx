import type { Metadata, Viewport } from "next";
import { JoinFlow } from "./join-flow";
import { VariantPicker } from "./variants/picker";
import { STEP_VARIANTS, type StepVariant } from "./variants/ids";

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

// ?__variant=trail|tower|channel picks the step bar (temporary harness)
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ __variant?: string }> }) {
  const { __variant } = await searchParams;
  const active = (STEP_VARIANTS.find((v) => v.id === __variant)?.id ?? "trail") as StepVariant;
  return (
    <VariantPicker active={active}>
      <JoinFlow steps={active} />
    </VariantPicker>
  );
}
