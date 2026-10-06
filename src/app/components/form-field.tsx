"use client";

// ---------------------------------------------------------------------------
// Form field: visible label, format placeholder, inline error wired with
// aria-describedby / aria-invalid. Used by the proposal and signup forms.
// ---------------------------------------------------------------------------
export const FIELD_CLASS =
  "w-full px-3.5 py-3 text-sm bg-transparent border border-foreground/20 placeholder:text-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-[border-color] duration-150 aria-[invalid=true]:border-danger";

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs tracking-wider opacity-70 mb-1.5">
      {children}
    </label>
  );
}

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  // Always rendered so the id aria-describedby points at exists; empty when valid.
  return (
    <p id={id} className="text-xs text-danger mt-1.5 min-h-[1.25em]">
      {children}
    </p>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function focusFirstInvalid(form: HTMLFormElement | null, order: string[]) {
  if (!form) return;
  for (const name of order) {
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLElement && el.getAttribute("aria-invalid") === "true") {
      el.focus();
      return;
    }
  }
}
