"use client";

// What two of the village's easter eggs open (see lib/eggs.ts): the
// final_v3_FINAL mailbox's stack of files, and the mailbox for letters to kaja.
import { useState } from "react";
import FeatherIcon from "feather-icons-react";
import { FIELD_CLASS, FieldError, FieldLabel } from "../components/form-field";
import { MAX_LETTER, VILLAGE_EMAIL_RE } from "./lib/villager";
import { CHIP, CHIP_ON, ICON_CHIP, PANEL } from "./chips";

const FILES: [string, string][] = [
  ["final.fig", "3 weeks ago"],
  ["final_v2.fig", "2 weeks ago"],
  ["final_final.fig", "last week"],
  ["final_v3_FINAL.fig", "yesterday"],
  ["final_ACTUAL_use_this.fig", "2 min ago"],
  ["final_ACTUAL_use_this (1).fig", "just now"],
];

function Close({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="close" className={`${ICON_CHIP} absolute right-3 top-3`}>
      <FeatherIcon icon="x" size={14} />
    </button>
  );
}

export function FilesPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside role="dialog" aria-labelledby="files-title" className={PANEL}>
      <Close onClose={onClose} />
      <div className="flex flex-col gap-1 pr-10">
        <h2 id="files-title" className="text-lg font-medium leading-tight" style={{ textTransform: "none" }}>
          final_v3_FINAL
        </h2>
        <span className="text-xs opacity-60">the mailbox is stuffed with files.</span>
      </div>
      <ul className="flex flex-col" aria-label="files">
        {FILES.map(([name, when], i) => (
          <li key={name} className="village-stagger flex items-center gap-2.5 py-1.5 border-b border-foreground/10 last:border-0" style={{ animationDelay: `${40 + i * 40}ms` }}>
            <FeatherIcon icon="file" size={14} className="shrink-0 opacity-60" />
            <span className="flex-1 min-w-0 break-all text-sm" style={{ textTransform: "none" }}>
              {name}
            </span>
            <small className="shrink-0 text-[11px] opacity-50">{when}</small>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function LetterPanel({ onClose, touch }: { onClose: () => void; touch: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; text?: string; form?: string }>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!text.trim()) next.text = "write something first.";
    if (!name.trim()) next.name = "add your name.";
    if (!email.trim()) next.email = "add your email, so kaja can write back.";
    else if (!VILLAGE_EMAIL_RE.test(email.trim())) next.email = "that doesn't look like an email.";
    setErrors(next);
    const first = (["text", "name", "email"] as const).find((k) => next[k]);
    if (first) {
      document.getElementById(`letter-${first}`)?.focus();
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/letters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ ...(data.errors ?? {}), form: data.errors ? undefined : (data.error ?? "couldn't send it. try again.") });
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setErrors({ form: "couldn't send it. check your connection and try again." });
      setState("idle");
    }
  };

  if (state === "sent") {
    return (
      <aside role="dialog" aria-labelledby="letter-title" className={PANEL}>
        <Close onClose={onClose} />
        <h2 id="letter-title" className="text-lg font-medium leading-tight pr-10">
          posted ✉
        </h2>
        <p className="text-sm leading-relaxed">thank you. kaja reads every letter, and she&apos;ll write back.</p>
        <button type="button" className={`${CHIP} ${CHIP_ON} self-start`} onClick={onClose}>
          back to the village
        </button>
      </aside>
    );
  }

  return (
    <aside role="dialog" aria-labelledby="letter-title" className={PANEL}>
      <Close onClose={onClose} />
      <div className="flex flex-col gap-1 pr-10">
        <h2 id="letter-title" className="text-lg font-medium leading-tight">
          a letter to kaja
        </h2>
        <span className="text-xs opacity-60">ideas for show &amp; tell, a talk you&apos;d give, or just hi.</span>
      </div>
      <form noValidate onSubmit={send} className="flex flex-col gap-3">
        <div>
          <FieldLabel htmlFor="letter-text">your letter</FieldLabel>
          <textarea
            id="letter-text"
            autoFocus={!touch}
            rows={5}
            maxLength={MAX_LETTER}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={!!errors.text}
            aria-describedby="letter-text-error"
            placeholder="dear kaja,"
            className={`${FIELD_CLASS} resize-none`}
          />
          <FieldError id="letter-text-error">{errors.text}</FieldError>
        </div>
        <div>
          <FieldLabel htmlFor="letter-name">your name</FieldLabel>
          <input
            id="letter-name"
            autoComplete="name"
            enterKeyHint="next"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby="letter-name-error"
            placeholder="ana novak"
            className={FIELD_CLASS}
          />
          <FieldError id="letter-name-error">{errors.name}</FieldError>
        </div>
        <div>
          <FieldLabel htmlFor="letter-email">your email</FieldLabel>
          <input
            id="letter-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            enterKeyHint="send"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby="letter-email-error"
            placeholder="you@studio.com"
            className={FIELD_CLASS}
          />
          <FieldError id="letter-email-error">{errors.email}</FieldError>
        </div>
        {errors.form && (
          <p role="alert" className="text-xs text-danger">
            {errors.form}
          </p>
        )}
        <button type="submit" disabled={state === "sending"} className={`${CHIP} ${CHIP_ON} h-10 justify-center text-sm`}>
          {state === "sending" ? "posting…" : "post it"}
        </button>
      </form>
    </aside>
  );
}
