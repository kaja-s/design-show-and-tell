"use client";

// ---------------------------------------------------------------------------
// TEMPORARY variant harness for the join step bar. ?__variant=<id> picks one;
// arrows step through, H hides the picker. Deliberately outside the design
// system. Delete this folder's picker and the page's import once one is chosen.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { STEP_VARIANTS, type StepVariant } from "./ids";
const GROUP = "Structure: how progress is shown";

const ARROW = (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v4a3 3 0 0 0 3 3h7" />
    <path d="m10 7 3 3-3 3" />
  </svg>
);

export function VariantPicker({ active, children }: { active: StepVariant; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const listRef = useRef<HTMLElement>(null);

  const go = (id: string) => router.replace(`${pathname}?__variant=${id}`, { scroll: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.key === "h" || e.key === "H") return setHidden((h) => !h);
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      const i = STEP_VARIANTS.findIndex((v) => v.id === active);
      const next = STEP_VARIANTS[(i + d + STEP_VARIANTS.length) % STEP_VARIANTS.length];
      e.preventDefault();
      go(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    listRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div className="variant-page">
      <style>{CSS}</style>
      <div className="variant-layout">
        <nav ref={listRef} className="variant-picker" aria-label="Variants" hidden={hidden}>
          <div className="variant-picker-group" role="group" aria-labelledby="variants-structure">
            <span className="variant-picker-heading" id="variants-structure">
              {ARROW}
              {GROUP}
            </span>
            {STEP_VARIANTS.map((v) => (
              <button key={v.id} type="button" data-variant={v.id} aria-pressed={v.id === active} onClick={() => go(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
        </nav>
        <div className="variant-picker-select" hidden={hidden}>
          <select aria-label="Variant" value={active} onChange={(e) => go(e.target.value)}>
            <optgroup label={GROUP}>
              {STEP_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </optgroup>
          </select>
          <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </div>
        <div className="variant-stage">{children}</div>
      </div>
    </div>
  );
}

// 208px list + 24px gap + 384px piece (the join column) = 616px
const CSS = `
.variant-page { container: variant-page / inline-size; width: 100%; padding: 16px 0 0; }
.variant-layout { display: flex; flex-direction: column; gap: 12px; max-width: 384px; margin-inline: auto; }
.variant-picker[hidden], .variant-picker-select[hidden] { display: none !important; }
.variant-picker { all: unset; display: none; flex-direction: column; gap: 16px; max-height: calc(100dvh - 48px); overflow-y: auto; scrollbar-width: none; padding: 6px; border-radius: 14px; background: rgb(20 20 20 / 0.92); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1); font: 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; user-select: none; }
.variant-picker-group { display: flex; flex-direction: column; gap: 2px; }
.variant-page .variant-picker-heading { display: flex; align-items: center; gap: 6px; padding: 4px 10px 6px; font-size: 11px; font-weight: 500; color: rgb(255 255 255 / 0.45); text-transform: none; }
.variant-page .variant-picker button { all: unset; flex: none; padding: 8px 10px; border-radius: 8px; font: inherit; color: rgb(255 255 255 / 0.6); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: none; transition: color 200ms ease-out, font-weight 200ms ease-out; }
.variant-page .variant-picker button:hover { color: rgb(255 255 255 / 0.85); }
.variant-page .variant-picker button[aria-pressed="true"] { background: rgb(255 255 255 / 0.14); color: rgb(255 255 255); font-weight: 500; }
.variant-page .variant-picker button:focus-visible { outline: 2px solid rgb(255 255 255 / 0.7); outline-offset: 2px; }
.variant-picker-select { position: relative; align-self: flex-start; max-width: 100%; color: rgb(255 255 255); margin-inline: 20px; }
.variant-picker-select select { all: unset; box-sizing: border-box; max-width: 100%; padding: 10px 36px 10px 16px; border-radius: 999px; background: rgb(20 20 20 / 0.92); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1); font: 500 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; cursor: pointer; }
.variant-picker-select select:focus-visible { outline: 2px solid rgb(255 255 255 / 0.7); outline-offset: 2px; }
.variant-picker-select svg { position: absolute; top: 50%; right: 14px; translate: 0 -50%; pointer-events: none; color: rgb(255 255 255 / 0.6); }
@container variant-page (min-width: 616px) {
  .variant-layout { display: grid; grid-template-columns: 208px 384px; justify-content: center; gap: 24px; align-items: start; max-width: none; }
  .variant-picker { display: flex; position: sticky; top: 24px; }
  .variant-picker-select { display: none; }
}
`;
