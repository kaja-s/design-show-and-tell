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
  // Always rendered so the id aria-describedby points at exists, but it takes
  // no space while empty, so the gap between fields stays one spacing step.
  return (
    <p id={id} className="text-xs text-danger mt-1.5 empty:hidden">
      {children}
    </p>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Typo check: "name@gmial.com" → "name@gmail.com". The domain is compared to
// common providers (global ones plus the slovenian isps) by edit distance; a
// near miss that isn't itself a known domain is a likely slip. Returns the
// corrected address or null. Short domains get a tighter threshold so
// "me.com" doesn't claim every two-letter host.
// ---------------------------------------------------------------------------
const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "hey.com",
  "fastmail.com",
  "siol.net",
  "t-2.net",
  "telemach.net",
  "amis.net",
];

function editDistance(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const d = editDistance(domain, candidate);
    const limit = candidate.length <= 7 ? 1 : 2;
    if (d <= limit && d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best ? `${local}@${best}` : null;
}

export function EmailSuggestion({ suggestion, onAccept }: { suggestion: string; onAccept: () => void }) {
  // Rendered inside FieldError: the fix is one click, sending again keeps the typed address.
  return (
    <>
      did you mean{" "}
      <button type="button" onClick={onAccept} className="underline underline-offset-2 hover:opacity-70 transition-opacity">
        {suggestion}
      </button>
      ? send again to keep yours.
    </>
  );
}

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
