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
import { PaintButton } from "./paint-button";
import { FIELD_CLASS, FieldLabel, FieldError, EMAIL_RE, focusFirstInvalid } from "./form-field";

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
  // Proposal box: compact by default, taller via the expand toggle.
  const [expanded, setExpanded] = useState(false);
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

  const close = () => setOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setMessage(data.message || "Got it.");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
        setOfferMailto(data.fallback === "mailto");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      setOfferMailto(true);
    }
  };

  const fieldClass =
    "w-full px-3.5 py-3 text-sm bg-transparent border border-foreground/20 placeholder:text-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-[border-color] duration-150";

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
              <div className="proposal-panel bg-background text-foreground border border-foreground/20 p-6 sm:p-8 w-full">
                {status === "success" ? (
                  <div className="flex flex-col items-start gap-2 animate-fade-in">
                    <h2 id="proposal-heading" className="text-sm font-bold">
                      {message}
                    </h2>
                    <p className="text-xs opacity-50">
                      thanks for putting your hand up.
                    </p>
                    <div className="mt-4">
                      <PaintButton onClick={close}>done</PaintButton>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {/* header: one bold line carries the ask, one quiet line carries the format */}
                    <div
                      className="animate-fade-in mb-5 flex items-start justify-between gap-4"
                      style={stage(0)}
                    >
                      <div>
                        <h2 id="proposal-heading" className="text-sm font-bold">
                          show us what you&apos;re making
                        </h2>
                        <p className="text-xs opacity-50 mt-1">
                          ten minutes, live. unfinished is welcome.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={close}
                        aria-label="Close"
                        className="-mr-2 -mt-2 p-2 opacity-40 hover:opacity-100 hover:rotate-90 transition-[opacity,transform] duration-300 ease-out"
                      >
                        <FeatherIcon icon="x" size={14} strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="animate-fade-in space-y-3" style={stage(1)}>
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text"
                          name="name"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="name"
                          required
                          disabled={status === "loading"}
                          className={fieldClass}
                        />
                        <input
                          type="email"
                          name="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email"
                          required
                          disabled={status === "loading"}
                          className={fieldClass}
                        />
                      </div>
                      <div className="relative">
                        <textarea
                          name="proposal"
                          value={proposal}
                          onChange={(e) => setProposal(e.target.value)}
                          placeholder="what would you show us? a sentence is enough."
                          required
                          rows={expanded ? 12 : 5}
                          maxLength={PROPOSAL_MAX}
                          disabled={status === "loading"}
                          className={`${fieldClass} resize-none leading-relaxed pb-8 transition-[height] duration-200 ease-out`}
                        />
                        <button
                          type="button"
                          onClick={() => setExpanded((v) => !v)}
                          aria-pressed={expanded}
                          aria-label={expanded ? "Collapse proposal field" : "Expand proposal field"}
                          className="absolute left-2 bottom-2 inline-flex items-center gap-1.5 px-1.5 py-1 text-[10px] tracking-wider opacity-40 hover:opacity-100 hover:bg-foreground/10 transition-[opacity,background-color] duration-150"
                        >
                          <FeatherIcon icon={expanded ? "minimize-2" : "maximize-2"} size={11} strokeWidth={2} />
                          {expanded ? "collapse" : "expand"}
                        </button>
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
                        className="text-xs opacity-40 hover:opacity-100 transition-opacity duration-150 disabled:opacity-20"
                      >
                        not now
                      </button>
                    </div>

                    {status === "error" && (
                      <div className="mt-3 text-xs space-y-1 animate-fade-in">
                        <p style={{ color: "#ef4444" }}>{message}</p>
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
