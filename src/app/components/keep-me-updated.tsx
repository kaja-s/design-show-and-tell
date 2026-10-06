"use client";

// "→ keep me updated", inline at the end of the "when + where?" answer, styled
// like every other link on the site. Click → name + email unfold under the
// answer → POST /api/subscribe, which adds the contact to the Loops list and
// fires the "signup" event that sends the welcome email.

import { useRef, useState } from "react";
import { Arc } from "loading-dev";
import { PaintButton } from "./paint-button";
import {
  FIELD_CLASS,
  FieldLabel,
  FieldError,
  EMAIL_RE,
  focusFirstInvalid,
  suggestEmail,
  EmailSuggestion,
} from "./form-field";

// same treatment as the FAQ's organizer links and the colophon
const LINK_CLASS = "underline hover:opacity-70 transition-opacity";

export function KeepMeUpdated() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
  }>({});
  // Likely email typo ("gmial.com"): shown once with a one-click fix; the same
  // address sent a second time is taken as deliberate.
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const confirmedEmail = useRef<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const openForm = () => {
    setOpen(true);
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLInputElement>('input[name="name"]')
        ?.focus(),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "enter your name.";
    if (!EMAIL_RE.test(email.trim()))
      errors.email = "enter an email address like name@example.com.";
    if (!errors.email) {
      const typed = email.trim();
      const suggestion = suggestEmail(typed);
      if (suggestion && confirmedEmail.current !== typed) {
        confirmedEmail.current = typed;
        errors.email = `did you mean ${suggestion}?`;
        setEmailSuggestion(suggestion);
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() =>
        focusFirstInvalid(formRef.current, ["name", "email"]),
      );
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "you're on the list.");
      } else {
        setStatus("error");
        setMessage(data.error || "couldn't add you. try again in a moment.");
      }
    } catch {
      setStatus("error");
      setMessage("couldn't add you. check your connection and try again.");
    }
  };

  if (status === "success") {
    return (
      <span className="block mt-4 animate-fade-in" role="status">
        {message}
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={openForm} className={LINK_CLASS}>
        → keep me updated
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-label="keep me updated"
      className="mt-6 animate-fade-in"
    >
      {/* one group: name + email, one spacing step apart; side by side when the panel is wide enough */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="keep-updated-name">name</FieldLabel>
          <input
            id="keep-updated-name"
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ana"
            required
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby="keep-updated-name-error"
            disabled={status === "loading"}
            className={FIELD_CLASS}
          />
          <FieldError id="keep-updated-name-error">
            {fieldErrors.name}
          </FieldError>
        </div>
        <div>
          <FieldLabel htmlFor="keep-updated-email">email</FieldLabel>
          <input
            id="keep-updated-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailSuggestion) {
                setEmailSuggestion(null);
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="name@example.com"
            required
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby="keep-updated-email-error"
            disabled={status === "loading"}
            className={FIELD_CLASS}
          />
          <FieldError id="keep-updated-email-error">
            {emailSuggestion ? (
              <EmailSuggestion
                suggestion={emailSuggestion}
                onAccept={() => {
                  setEmail(emailSuggestion);
                  setEmailSuggestion(null);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  formRef.current
                    ?.querySelector<HTMLInputElement>('input[name="email"]')
                    ?.focus();
                }}
              />
            ) : (
              fieldErrors.email
            )}
          </FieldError>
        </div>
      </div>
      {/* actions: two steps below the field group so they read as a separate group */}
      <div className="mt-6 flex items-center gap-4">
        <PaintButton type="submit" disabled={status === "loading"}>
          {status === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Arc size={12} />
              sending
            </span>
          ) : (
            "keep me updated"
          )}
        </PaintButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={status === "loading"}
          className="text-xs opacity-40 hover:opacity-100 transition-opacity duration-150 disabled:opacity-20 py-2 px-2 -mx-2 min-h-10"
        >
          not now
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {message}
        </p>
      )}
    </form>
  );
}
