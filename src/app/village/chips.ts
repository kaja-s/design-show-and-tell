// The village's small square buttons, shared by village-app.tsx and egg-panels.tsx.
export const CHIP =
  "h-8 inline-flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-foreground/15 px-2.5 text-xs transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.97] hover:bg-highlight hover:text-highlight-text hover:border-highlight";
export const ICON_CHIP = `${CHIP} w-8 justify-center px-0`;
export const CHIP_ON = "bg-highlight text-highlight-text border-highlight";
// The card that slides in: a bottom sheet on phones, a panel on the right otherwise.
export const PANEL =
  "village-card absolute inset-x-0 bottom-0 z-[4] max-h-[72%] sm:inset-x-auto sm:right-3 sm:top-14 sm:bottom-auto sm:w-[320px] overflow-y-auto bg-background/95 backdrop-blur border border-foreground/15 p-5 flex flex-col gap-4 select-text";
