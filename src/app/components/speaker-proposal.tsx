"use client";

// Primary CTA between events while we're looking for speakers.
// "call for speakers" → a modal <dialog> with a short form (name, email, idea)
// → POST /api/propose, which emails the organizer via Loops. If sending isn't
// configured (503) or fails, the form offers a pre-filled mailto: so the idea
// still reaches the inbox.
//
// The dialog uses the native top layer (showModal), so Escape, focus trapping
// and inertness of the page come for free. It is portalled to <body> and sets
// data-proposal-open on <body> while up; globals.css blurs the page's other
// top-level children off that attribute and dims via ::backdrop.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Arc } from "loading-dev";
import FeatherIcon from "feather-icons-react";
import Image from "next/image";
import { PaintButton } from "./paint-button";
import { FIELD_CLASS, FieldLabel, FieldError, EMAIL_RE, focusFirstInvalid, suggestEmail, EmailSuggestion } from "./form-field";

const ORGANIZER_EMAIL = "kaja.skerlj@gmail.com";
const PROPOSAL_MAX = 2000;

function mailtoHref(name: string, email: string, proposal: string) {
  const subject = "design show & tell — speaker proposal";
  const body = [`name: ${name}`, `email: ${email}`, "", proposal].join("\n");
  return `mailto:${ORGANIZER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function SpeakerProposal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [proposal, setProposal] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [offerMailto, setOfferMailto] = useState(false);
  // Per-field messages from on-submit validation; empty = valid.
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; proposal?: string }>({});
  // Likely email typo ("gmial.com"): shown once with a one-click fix; the same
  // address sent a second time is taken as deliberate.
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const confirmedEmail = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Proposal box: compact by default, taller via the expand toggle.
  const [expanded, setExpanded] = useState(false);
  // Success sign-off: the photo is hidden until the name is hovered, focused or tapped.
  const [signed, setSigned] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Portals need document; this is false during SSR/hydration and true after.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Sync the native dialog with React state. showModal() puts it in the top
  // layer; we lock page scroll while it's up and hand focus to the first field.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
      document.body.dataset.proposalOpen = "true";
      dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
      return () => {
        document.body.style.overflow = "";
        delete document.body.dataset.proposalOpen;
      };
    }
    if (dialog.open) dialog.close();
  }, [open, mounted]);

  const close = () => {
    setOpen(false);
    setSigned(false);
  };

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "enter your name.";
    if (!EMAIL_RE.test(email.trim())) errors.email = "enter an email address like name@example.com.";
    if (!proposal.trim()) errors.proposal = "tell us what you'd show, a sentence is enough.";
    return errors;
  };

  const checkEmailTypo = (errors: typeof fieldErrors) => {
    if (errors.email) return;
    const typed = email.trim();
    const suggestion = suggestEmail(typed);
    if (suggestion && confirmedEmail.current !== typed) {
      confirmedEmail.current = typed;
      errors.email = `did you mean ${suggestion}?`;
      setEmailSuggestion(suggestion);
    }
  };

  const acceptEmailSuggestion = () => {
    if (!emailSuggestion) return;
    setEmail(emailSuggestion);
    setEmailSuggestion(null);
    setFieldErrors((prev) => ({ ...prev, email: undefined }));
    formRef.current?.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    checkEmailTypo(errors);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      // let aria-invalid land in the DOM, then move focus to the first failing field
      requestAnimationFrame(() => focusFirstInvalid(formRef.current, ["name", "email", "proposal"]));
      return;
    }
    setStatus("loading");
    setMessage("");
    setOfferMailto(false);
    try {
      const response = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, proposal }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "thanks! i'll read it and get back to you soon.");
      } else {
        setStatus("error");
        setMessage(data.error || "couldn't send that. check your connection and try again, or email it instead.");
        setOfferMailto(data.fallback === "mailto");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      setOfferMailto(true);
    }
  };

  // Staged entrance inside the dialog: header, fields, action, 100ms apart.
  const stage = (i: number): React.CSSProperties => ({
    animationDelay: `${i * 100}ms`,
    animationFillMode: "both",
  });

  return (
    <section className="flex justify-center">
      <PaintButton onClick={() => setOpen(true)}>call for speakers</PaintButton>

      {mounted &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="proposal-dialog"
            aria-labelledby="proposal-heading"
            // Escape fires "cancel" → "close"; keep React state in sync.
            onClose={close}
            // A click on the backdrop lands on the <dialog> itself, not its children.
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            {open && (
              <div className="proposal-panel bg-background text-foreground border border-foreground/20 p-6 w-full">
                {status === "success" ? (
                  <div className="animate-fade-in">
                    {/* message: one bold line, one quiet line, 8px apart */}
                    <h2 id="proposal-heading" className="text-sm font-bold text-balance">
                      {message}
                    </h2>
                    <p className="mt-2 text-xs opacity-50">
                      i read every proposal myself, so the reply will come from my own inbox.
                    </p>
                    {/* signature, 20px below the message so it reads as its own group: the name
                        over a note, photo trailing. easter egg: hover, focus or tap the name and
                        the photo resolves as a halftone (.sig-photo in globals.css), duotone like
                        the event photos, then the note follows. hover the photo itself for colour. */}
                    <button
                      type="button"
                      onClick={() => setSigned((v) => !v)}
                      aria-pressed={signed}
                      data-signed={signed || undefined}
                      className="sig group/sig mt-5 flex items-center gap-3 text-left text-xs"
                    >
                      <span className="flex flex-col">
                        <span>— kaja</span>
                        <span
                          className={`transition-[opacity,transform] ease-out ${
                            signed
                              ? "opacity-50 translate-y-0 duration-500 delay-300"
                              : "opacity-0 -translate-y-1 duration-300 group-hover/sig:opacity-50 group-hover/sig:translate-y-0 group-hover/sig:duration-500 group-hover/sig:delay-300 group-focus-visible/sig:opacity-50 group-focus-visible/sig:translate-y-0 group-focus-visible/sig:duration-500 group-focus-visible/sig:delay-300"
                          }`}
                        >
                          hi from stockholm!
                        </span>
                      </span>
                      <span
                        className={`group/photo relative block h-10 w-10 border transition-colors duration-300 ease-out ${
                          signed
                            ? "border-foreground/20"
                            : "border-transparent group-hover/sig:border-foreground/20 group-focus-visible/sig:border-foreground/20"
                        }`}
                      >
                        <span className="sig-photo absolute inset-0 block bg-foreground">
                          <Image
                            src="/kaja.jpg"
                            alt="kaja, smiling with a matcha latte in a café"
                            width={471}
                            height={480}
                            sizes="40px"
                            className="h-full w-full object-cover grayscale transition-[filter] duration-500 ease-out group-hover/photo:grayscale-0"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-foreground mix-blend-lighten dark:mix-blend-darken transition-opacity duration-500 ease-out group-hover/photo:opacity-0 pointer-events-none"
                          />
                        </span>
                      </span>
                    </button>
                    {/* action, 20px below (the note line reserves space, so the idle gap is larger) */}
                    <div className="mt-5">
                      <PaintButton onClick={close}>done</PaintButton>
                    </div>
                  </div>
                ) : (
                  <form ref={formRef} onSubmit={handleSubmit} noValidate>
                    {/* header: one bold line carries the ask, one quiet line carries the format */}
                    <div
                      className="animate-fade-in mb-5 flex items-start justify-between gap-4"
                      style={stage(0)}
                    >
                      <div className="min-w-0">
                        <h2 id="proposal-heading" className="text-sm font-bold">
                          what are you working on?
                        </h2>
                        <p className="text-xs opacity-50 mt-1">
                          we&apos;d love to see it. ten minutes, live, no slides. half-finished is perfect.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={close}
                        aria-label="Close"
                        className="-mr-3 -mt-3 p-[13px] opacity-40 hover:opacity-100 hover:rotate-90 transition-[opacity,transform] duration-300 ease-out"
                      >
                        <FeatherIcon icon="x" size={14} strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="animate-fade-in space-y-4" style={stage(1)}>
                      <div>
                        <FieldLabel htmlFor="proposal-name">name</FieldLabel>
                        <input
                          id="proposal-name"
                          type="text"
                          name="name"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="ana"
                          required
                          aria-invalid={fieldErrors.name ? true : undefined}
                          aria-describedby="proposal-name-error"
                          disabled={status === "loading"}
                          className={FIELD_CLASS}
                        />
                        <FieldError id="proposal-name-error">{fieldErrors.name}</FieldError>
                      </div>
                      <div>
                        <FieldLabel htmlFor="proposal-email">email</FieldLabel>
                        <input
                          id="proposal-email"
                          type="email"
                          name="email"
                          autoComplete="email"
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
                          aria-describedby="proposal-email-error"
                          disabled={status === "loading"}
                          className={FIELD_CLASS}
                        />
                        <FieldError id="proposal-email-error">
                          {emailSuggestion ? (
                            <EmailSuggestion suggestion={emailSuggestion} onAccept={acceptEmailSuggestion} />
                          ) : (
                            fieldErrors.email
                          )}
                        </FieldError>
                      </div>
                      <div>
                        <FieldLabel htmlFor="proposal-text">what would you show us?</FieldLabel>
                        <div className="relative">
                          <textarea
                            id="proposal-text"
                            name="proposal"
                            value={proposal}
                            onChange={(e) => setProposal(e.target.value)}
                            placeholder="a prototype, a side project, a tool you've been exploring…"
                            required
                            rows={expanded ? 12 : 5}
                            maxLength={PROPOSAL_MAX}
                            aria-invalid={fieldErrors.proposal ? true : undefined}
                            aria-describedby="proposal-text-error"
                            disabled={status === "loading"}
                            className={`${FIELD_CLASS} resize-none leading-relaxed pb-8 transition-[height,border-color] duration-200 ease-out`}
                          />
                          <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            aria-pressed={expanded}
                            aria-label={expanded ? "Collapse proposal field" : "Expand proposal field"}
                            className="absolute left-2 bottom-2 inline-flex items-center gap-1.5 px-2 py-1.5 min-h-6 text-xs tracking-wider opacity-40 hover:opacity-100 hover:bg-foreground/10 transition-[opacity,background-color] duration-150"
                          >
                            <FeatherIcon icon={expanded ? "minimize-2" : "maximize-2"} size={11} strokeWidth={2} />
                            {expanded ? "collapse" : "expand"}
                          </button>
                        </div>
                        <FieldError id="proposal-text-error">{fieldErrors.proposal}</FieldError>
                      </div>
                    </div>

                    <div
                      className="animate-fade-in mt-5 flex items-center gap-4"
                      style={stage(2)}
                    >
                      <PaintButton
                        type="submit"
                        disabled={status === "loading"}
                      >
                        {status === "loading" ? (
                          <span className="inline-flex items-center gap-2">
                            <Arc size={12} />
                            sending
                          </span>
                        ) : (
                          "send proposal"
                        )}
                      </PaintButton>
                      <button
                        type="button"
                        onClick={close}
                        disabled={status === "loading"}
                        className="text-xs opacity-40 hover:opacity-100 transition-opacity duration-150 disabled:opacity-20 py-2 px-2 -mx-2 min-h-10"
                      >
                        not now
                      </button>
                    </div>

                    {status === "error" && (
                      <div role="alert" className="mt-3 text-xs space-y-1 animate-fade-in">
                        <p className="text-danger">{message}</p>
                        {offerMailto && (
                          <p className="opacity-70">
                            <a
                              href={mailtoHref(name, email, proposal)}
                              className="underline hover:opacity-100"
                            >
                              email it instead
                            </a>{" "}
                            (opens your mail app with everything filled in)
                          </p>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}
          </dialog>,
          document.body,
        )}
    </section>
  );
}
