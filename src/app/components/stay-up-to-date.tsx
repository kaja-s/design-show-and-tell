"use client";

import { useRef, useState } from "react";
import { Arc } from "loading-dev";
import { PaintButton } from "./paint-button";
import { FIELD_CLASS, FieldLabel, FieldError, EMAIL_RE, focusFirstInvalid } from "./form-field";

export function StayUpToDate() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "enter your name.";
    if (!EMAIL_RE.test(email.trim())) errors.email = "enter an email address like name@example.com.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current, ["name", "email"]));
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "You're on the list.");
        setName("");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (!open) {
    return (
      <section className="flex justify-center">
        <PaintButton onClick={() => setOpen(true)}>stay up to date</PaintButton>
      </section>
    );
  }

  if (status === "success") {
    return (
      <section className="flex flex-col items-center gap-2 animate-fade-in">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs opacity-50">reply back with a "Hi!" :)</p>
      </section>
    );
  }

  return (
    <section className="flex justify-center animate-fade-in">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="w-full max-w-sm space-y-4">
        <p className="text-sm opacity-60 text-center">
          stay up to date on the next event by entering your name and email.
        </p>
        <div>
          <FieldLabel htmlFor="signup-name">name</FieldLabel>
          <input
            id="signup-name"
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ana novak"
            required
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby="signup-name-error"
            disabled={status === "loading"}
            className={FIELD_CLASS}
          />
          <FieldError id="signup-name-error">{fieldErrors.name}</FieldError>
        </div>
        <div>
          <FieldLabel htmlFor="signup-email">email</FieldLabel>
          <input
            id="signup-email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby="signup-email-error"
            disabled={status === "loading"}
            className={FIELD_CLASS}
          />
          <FieldError id="signup-email-error">{fieldErrors.email}</FieldError>
        </div>
        <div className="flex justify-center">
          <PaintButton type="submit" disabled={status === "loading"}>
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <Arc size={12} />
                sending
              </span>
            ) : (
              "stay up to date"
            )}
          </PaintButton>
        </div>
        {message && status === "error" && (
          <p role="alert" className="text-xs text-center text-danger">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
